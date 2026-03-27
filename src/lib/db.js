// Filename: src/lib/db.js

const DB_NAME = 'XBookmarkViewerDB';
const STORE_NAME = 'workspace';

/**
 * Initializes and returns the IndexedDB instance.
 */
const getDB = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onerror = () => reject(request.error);
  request.onsuccess = () => resolve(request.result);
  request.onupgradeneeded = (e) => {
    e.target.result.createObjectStore(STORE_NAME);
  };
});

/**
 * Saves a generic key-value pair to IndexedDB.
 */
export const saveToDB = async (key, data) => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(data, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) { 
    console.error("DB Save Error:", err); 
  }
};

/**
 * Loads a value by key from IndexedDB.
 */
export const loadFromDB = async (key) => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) { 
    console.error("DB Load Error:", err); 
    return null; 
  }
};

/**
 * Clears the entire workspace database.
 */
export const clearDB = async () => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) { 
    console.error("DB Clear Error:", err); 
  }
};

/**
 * Saves a massive array of bookmarks by chunking them to prevent OOM crashes.
 */
export const saveBookmarksToDB = async (bookmarksArray) => {
  try {
     const db = await getDB();
     await new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAllKeys();
        req.onsuccess = () => {
           // Clean up old chunks before saving new ones
           req.result.forEach(key => {
              if (typeof key === 'string' && key.startsWith('bookmarks_chunk_')) {
                 store.delete(key);
              }
           });
           store.delete('bookmarks_data'); // Clear legacy structure if exists
        };
        tx.oncomplete = () => resolve();
     });

     const CHUNK_SIZE = 5000;
     let chunksCount = 0;
     for (let i = 0; i < bookmarksArray.length; i += CHUNK_SIZE) {
         const chunk = bookmarksArray.slice(i, i + CHUNK_SIZE);
         await saveToDB(`bookmarks_chunk_${chunksCount}`, chunk);
         chunksCount++;
     }
     await saveToDB('bookmarks_chunk_count', chunksCount);
  } catch (e) { 
    console.error("Error saving chunks", e); 
  }
};

/**
 * Reassembles chunked bookmarks from IndexedDB into a single array.
 */
export const loadBookmarksFromDB = async () => {
   try {
      // Automatic migration from legacy monolithic storage
      const monolithic = await loadFromDB('bookmarks_data');
      if (monolithic && Array.isArray(monolithic)) {
         await saveBookmarksToDB(monolithic);
         return monolithic;
      }

      const count = await loadFromDB('bookmarks_chunk_count');
      if (!count) return [];

      let allData = [];
      for (let i = 0; i < count; i++) {
         const chunk = await loadFromDB(`bookmarks_chunk_${i}`);
         if (chunk) allData = allData.concat(chunk);
      }
      return allData;
   } catch (e) { 
      console.error("Error loading chunks", e); 
      return []; 
   }
};
