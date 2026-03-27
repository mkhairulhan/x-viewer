// Filename: src/workers/ingest.worker.js

import { normalizeTweet } from '../lib/normalizer.js';

/**
 * PHASE 4/5: Background Ingestion & Merge Engine
 * Offloads massive JSON parsing to a background thread.
 * Protects custom_notes and custom_tags during Upsert Merging collisions.
 */
self.onmessage = async (e) => {
    // Phase 5: Receive existing notes and tags from main thread to inform the merge
    const { files, existingBookmarks, existingNotes, existingTags } = e.data;
    
    try {
        let newBookmarks = [...existingBookmarks];
        const existingIds = new Set(newBookmarks.map(b => b.id));
        
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

            const items = Array.isArray(parsedData) ? parsedData : (parsedData.data || []);
            
            self.postMessage({ type: 'progress', message: `Normalizing ${items.length} bookmarks...` });
            
            const chunkSize = 5000;
            for (let j = 0; j < items.length; j += chunkSize) {
                const chunk = items.slice(j, j + chunkSize);
                const normalizedItems = chunk.map(normalizeTweet).filter(t => t && t.id);

                normalizedItems.forEach(item => {
                    // PHASE 5: Detect embedded metadata from Workspace backups
                    // If local state lacks the note/tag, import it. (Local State always wins to prevent old backups from overwriting current work).
                    if (item.custom_notes && !existingNotes[item.id]) {
                        importedNotes[item.id] = item.custom_notes;
                    }
                    if (item.custom_tags && item.custom_tags.length > 0 && !existingTags[item.id]) {
                        importedTags[item.id] = item.custom_tags;
                    }

                    if (!existingIds.has(item.id)) {
                        newBookmarks.push(item);
                        existingIds.add(item.id);
                    } else {
                        // Scenario A: Upsert Merge (Protecting Media Metadata)
                        const existingIndex = newBookmarks.findIndex(b => b.id === item.id);
                        if (existingIndex > -1 && item.media.length > 0 && newBookmarks[existingIndex].media.length === 0) {
                            newBookmarks[existingIndex] = item;
                        }
                    }
                });
                
                self.postMessage({ type: 'progress', message: `Normalized ${Math.min(j + chunkSize, items.length)} / ${items.length}...` });
            }
        }
        
        self.postMessage({ type: 'done', payload: { bookmarks: newBookmarks, importedNotes, importedTags } });
    } catch (error) {
        self.postMessage({ type: 'error', payload: error.message });
    }
};