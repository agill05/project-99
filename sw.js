const CACHE_NAME = 'elkpd-steam-v1';
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbyGz4GEAjqem8xFz-kK2vrabSE7rHS71DyPwHTWDMaoI80dNTi_fEEj0yqV5MVZLj8LyA/exec';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-outbox-submissions') {
        event.waitUntil(processOutboxQueue());
    }
});

function openOutboxDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('ELKPD_STEAM_DB', 1);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function processOutboxQueue() {
    try {
        const db = await openOutboxDB();
        const tx = db.transaction('outbox', 'readonly');
        const store = tx.objectStore('outbox');
        const itemsReq = store.getAll();

        itemsReq.onsuccess = async () => {
            const items = itemsReq.result || [];
            for (const item of items) {
                try {
                    const response = await fetch(GAS_API_URL, {
                        method: 'POST',
                        body: JSON.stringify(item.payload)
                    });
                    const resJson = await response.json();

                    if (resJson && resJson.success) {
                        const delTx = db.transaction('outbox', 'readwrite');
                        delTx.objectStore('outbox').delete(item.id);
                    }
                } catch (err) {
                    console.warn('[SW Background Sync] Percobaan kirim gagal, akan dicoba otomatis nanti:', err);
                }
            }
        };
    } catch (err) {
        console.error('[SW Background Sync Error]:', err);
    }
}
