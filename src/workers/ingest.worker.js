// Filename: src/workers/ingest.worker.js

import { normalizeTweet } from '../lib/normalizer.js';

/**
 * PHASE 4/5: Background Ingestion & Merge Engine (STREAMING EDITION)
 * - Zero-Dependency Streaming Parser prevents OOM crashes on mobile/low-end devices.
 * - O(1) Map Upserts eliminate CPU thrashing during massive imports.
 * - Graceful Fallback for exotic JSONL formats.
 */
self.onmessage = async (e) => {
    const { files, existingBookmarks, existingNotes, existingTags } = e.data;
    
    try {
        // HIGH PERFORMANCE LOOKUP: Convert to Map for O(1) Upserts.
        const bookmarksMap = new Map();
        for (let i = 0; i < existingBookmarks.length; i++) {
            bookmarksMap.set(existingBookmarks[i].id, existingBookmarks[i]);
        }
        
        const importedNotes = {};
        const importedTags = {};

        // Helper to process and merge normalized items into the Map
        const processBatch = (batch) => {
            batch.forEach(rawItem => {
                const item = normalizeTweet(rawItem);
                
                // Safety Guard: Ignore junk objects (e.g., metadata blocks) extracted from arrays
                if (!item.id || item.id === 'unknown') return; 

                // Local State Priority: Protect existing notes/tags
                if (item.custom_notes && !existingNotes[item.id]) {
                    importedNotes[item.id] = item.custom_notes;
                }
                if (item.custom_tags && item.custom_tags.length > 0 && !existingTags[item.id]) {
                    importedTags[item.id] = item.custom_tags;
                }

                if (!bookmarksMap.has(item.id)) {
                    bookmarksMap.set(item.id, item);
                } else {
                    // Scenario A: Intelligent Hybrid Upsert Merge
                    const existing = bookmarksMap.get(item.id);
                    const incoming = item;
                    
                    const richSource = incoming._is_rich ? incoming : (existing._is_rich ? existing : incoming);
                    
                    const mergedMetrics = {
                        favorite_count: Math.max(existing.metrics.favorite_count, incoming.metrics.favorite_count),
                        retweet_count: Math.max(existing.metrics.retweet_count, incoming.metrics.retweet_count),
                        reply_count: Math.max(existing.metrics.reply_count, incoming.metrics.reply_count),
                        views_count: Math.max(existing.metrics.views_count, incoming.metrics.views_count),
                        quote_count: Math.max(existing.metrics.quote_count, incoming.metrics.quote_count),
                        bookmark_count: Math.max(existing.metrics.bookmark_count, incoming.metrics.bookmark_count)
                    };

                    const mergedMedia = existing.media.length >= incoming.media.length ? existing.media : incoming.media;

                    const mergedItem = {
                        ...richSource, 
                        _is_rich: existing._is_rich || incoming._is_rich, 
                        _last_updated: Date.now(),
                        metrics: mergedMetrics,
                        media: mergedMedia,
                        custom_notes: existing.custom_notes || incoming.custom_notes,
                        custom_tags: existing.custom_tags?.length ? existing.custom_tags : incoming.custom_tags
                    };

                    bookmarksMap.set(item.id, mergedItem);
                }
            });
        };

        const BATCH_SIZE = 2000;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            self.postMessage({ type: 'progress', message: `Initializing Stream for File ${i + 1} of ${files.length}...` });
            
            let processedItemsThisFile = 0;
            let itemsBatch = [];

            // --- STREAMING ENGINE ---
            const stream = file.stream();
            const reader = stream.getReader();
            const decoder = new TextDecoder();

            let buffer = '';
            let inString = false;
            let isEscaped = false;
            let braceDepth = 0;
            let bracketDepth = 0;
            let isCapturing = false;
            let startIndex = -1;
            let captureBraceDepth = -1;
            
            // ARCHITECTURAL FIX: Persistent cursor must live outside the chunk-reading loop
            let j = 0; 

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        if (itemsBatch.length > 0) {
                            processBatch(itemsBatch);
                            processedItemsThisFile += itemsBatch.length;
                        }
                        break;
                    }

                    // { stream: true } handles split multibyte unicode characters safely
                    buffer += decoder.decode(value, { stream: true });

                    // State Machine: Scans for complete JSON objects within Arrays
                    while (j < buffer.length) {
                        const char = buffer[j];

                        if (isEscaped) {
                            isEscaped = false;
                            j++;
                            continue;
                        }
                        if (char === '\\') {
                            isEscaped = true;
                            j++;
                            continue;
                        }
                        if (char === '"') {
                            inString = !inString;
                            j++;
                            continue;
                        }
                        if (inString) {
                            j++;
                            continue;
                        }

                        if (char === '[') {
                            bracketDepth++;
                        } else if (char === ']') {
                            bracketDepth--;
                        } else if (char === '{') {
                            if (!isCapturing && bracketDepth > 0) {
                                // Start capturing the object (ignoring root-level wrappers)
                                isCapturing = true;
                                startIndex = j;
                                captureBraceDepth = braceDepth;
                            }
                            braceDepth++;
                        } else if (char === '}') {
                            braceDepth--;
                            if (isCapturing && braceDepth === captureBraceDepth) {
                                // Object fully enclosed! Extract, parse, and free memory immediately.
                                const objStr = buffer.substring(startIndex, j + 1);
                                try {
                                    const parsedObj = JSON.parse(objStr);
                                    itemsBatch.push(parsedObj);
                                    
                                    if (itemsBatch.length >= BATCH_SIZE) {
                                        processBatch(itemsBatch);
                                        processedItemsThisFile += itemsBatch.length;
                                        self.postMessage({ type: 'progress', message: `Streamed & Merged ${processedItemsThisFile} items...` });
                                        itemsBatch = [];
                                    }
                                } catch (err) {
                                    // Skip malformed chunks gracefully
                                }
                                
                                // Slice buffer to clear memory (GC)
                                isCapturing = false;
                                buffer = buffer.substring(j + 1);
                                
                                // ARCHITECTURAL FIX: Reset cursor relative to the new sliced buffer 
                                // and continue immediately so we don't accidentally execute j++
                                j = 0; 
                                startIndex = -1;
                                continue; 
                            }
                        }
                        j++;
                    }
                }
            } catch (e) {
                console.warn("Stream processing interrupted.", e);
            }

            // --- GRACEFUL FALLBACK (JSONL & Exotic Formats) ---
            // If the stream found 0 items, the file might lack Arrays (e.g., pure JSONL format)
            if (processedItemsThisFile === 0) {
                self.postMessage({ type: 'progress', message: `Stream found 0 objects. Falling back to Full Parse Mode...` });
                
                // File stream is consumed, so we must re-read via text()
                const text = await file.text();
                let parsedData;
                try {
                    parsedData = JSON.parse(text);
                } catch (err) {
                    parsedData = JSON.parse(`[${text.replace(/}\s*{/g, '},{')}]`);
                }

                const items = Array.isArray(parsedData) ? parsedData : (parsedData.bookmarks || []);
                
                for (let k = 0; k < items.length; k += BATCH_SIZE) {
                    const chunk = items.slice(k, k + BATCH_SIZE);
                    processBatch(chunk);
                    processedItemsThisFile += chunk.length;
                    self.postMessage({ type: 'progress', message: `Fallback Merged ${processedItemsThisFile} items...` });
                }
            }
        }
        
        // Finalize: Convert Map back to a flat array for the UI store
        const newBookmarks = Array.from(bookmarksMap.values());
        self.postMessage({ type: 'done', payload: { bookmarks: newBookmarks, importedNotes, importedTags } });
    } catch (error) {
        self.postMessage({ type: 'error', payload: error.message });
    }
};