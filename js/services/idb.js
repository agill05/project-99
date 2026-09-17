import { DB_NAME, DB_VERSION } from '../config.js';

export function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache');
      if (!db.objectStoreNames.contains('outbox')) {
        db.createObjectStore('outbox', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function setIDBCache(key, val) {
  try {
    const db = await initIndexedDB();
    const tx = db.transaction('cache', 'readwrite');
    tx.objectStore('cache').put(val, key);
  } catch (e) {
    console.error('IDB Cache Save Error:', e);
  }
}

export async function getIDBCache(key) {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction('cache', 'readonly');
      const req = tx.objectStore('cache').get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

export async function saveToOutboxQueue(id, payload) {
  try {
    const db = await initIndexedDB();
    const tx = db.transaction('outbox', 'readwrite');
    tx.objectStore('outbox').put({ id, payload, timestamp: Date.now() });
  } catch (e) {
    console.error('IDB Outbox Save Error:', e);
  }
}
