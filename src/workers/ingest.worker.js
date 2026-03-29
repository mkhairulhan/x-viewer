// Filename: src/workers/ingest.worker.js

import { normalizeTweet } from '../lib/normalizer.js';

/**
 * PHASE 4/5: Background Ingestion & Merge Engine
 * Offloads massive JSON parsing to a background thread.
 * Protects custom_notes and custom_tags during Upsert Merging collisions.
 * Implements "Hybrid Merge" to preserve Rich profile data while updating fresh metrics.
 */
self.onmessage = async (e) => {
    // Phase 5: Receive existing notes and tags from main thread to inform the merge
    const { files, existingBookmarks, existingNotes, existingTags } = e.data;
    
    try {
        // HIGH PERFORMANCE LOOKUP: Convert to Map for O(1) Upserts.
        // This eliminates the catastrophic O(N^2) memory bottleneck caused by .findIndex inside loops.
        const bookmarksMap = new Map();
        for (let i = 0; i < existingBookmarks.length; i++) {
            bookmarksMap.set(existingBookmarks[i].id, existingBookmarks[i]);
        }
        
        const importedNotes = {};
        const importedTags = {};

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            self.postMessage({ type: 'progress', message: `Reading file ${i + 1} of ${files.length}...` });
            
            const text = await file.text();
            
            self.postMessage({ type: 'progress', message: `Parsing JSON tree...` });
            let parsedData;
            try {
                parsedData = JSON.parse(text);
            } catch (err) {
                parsedData = JSON.parse(`[${text.replace(/}\s*{/g, '},{')}]`);
            }

            const items = Array.isArray(parsedData) ? parsedData : (parsedData.bookmarks || []);
            
            // Process chunks to avoid freezing the worker entirely
            const chunkSize = 2000;
            for (let j = 0; j < items.length; j += chunkSize) {
                const chunk = items.slice(j, j + chunkSize);
                
                chunk.forEach(rawItem => {
                    const item = normalizeTweet(rawItem);
                    
                    // If the incoming item has notes/tags AND the DB lacks the note/tag, import it. 
                    // (Local State always wins to prevent old backups from overwriting current work).
                    if (item.custom_notes && !existingNotes[item.id]) {
                        importedNotes[item.id] = item.custom_notes;
                    }
                    if (item.custom_tags && item.custom_tags.length > 0 && !existingTags[item.id]) {
                        importedTags[item.id] = item.custom_tags;
                    }

                    if (!bookmarksMap.has(item.id)) {
                        bookmarksMap.set(item.id, item);
                    } else {
                        // Scenario A: Intelligent Hybrid Upsert Merge (O(1) Array Update via Map)
                        const existing = bookmarksMap.get(item.id);
                        const incoming = item;
                        
                        // 1. Determine "Richness" Base (Always preserve deep creator profile data)
                        const richSource = incoming._is_rich ? incoming : (existing._is_rich ? existing : incoming);
                        
                        // 2. Refresh Metrics (Always take the highest engagement metrics simulating freshness)
                        const mergedMetrics = {
                            favorite_count: Math.max(existing.metrics.favorite_count, incoming.metrics.favorite_count),
                            retweet_count: Math.max(existing.metrics.retweet_count, incoming.metrics.retweet_count),
                            reply_count: Math.max(existing.metrics.reply_count, incoming.metrics.reply_count),
                            views_count: Math.max(existing.metrics.views_count, incoming.metrics.views_count),
                            quote_count: Math.max(existing.metrics.quote_count, incoming.metrics.quote_count),
                            bookmark_count: Math.max(existing.metrics.bookmark_count, incoming.metrics.bookmark_count)
                        };

                        // 3. Preserve Media (Never drop media if one export is missing it)
                        const mergedMedia = existing.media.length >= incoming.media.length ? existing.media : incoming.media;

                        // 4. Construct the Hybrid Entity
                        const mergedItem = {
                            ...richSource, // Base fields from the richest export
                            _is_rich: existing._is_rich || incoming._is_rich, 
                            _last_updated: Date.now(),
                            metrics: mergedMetrics, // Override with fresh metrics
                            media: mergedMedia, // Override with safest media array
                            
                            // Protect custom user data during merge
                            custom_notes: existing.custom_notes || incoming.custom_notes,
                            custom_tags: existing.custom_tags?.length ? existing.custom_tags : incoming.custom_tags
                        };

                        bookmarksMap.set(item.id, mergedItem);
                    }
                });
                
                self.postMessage({ type: 'progress', message: `Normalized ${Math.min(j + chunkSize, items.length)} / ${items.length}...` });
            }
        }
        
        // Convert Map back to flat Array for the UI payload
        const newBookmarks = Array.from(bookmarksMap.values());
        self.postMessage({ type: 'done', payload: { bookmarks: newBookmarks, importedNotes, importedTags } });
    } catch (error) {
        self.postMessage({ type: 'error', payload: error.message });
    }
};