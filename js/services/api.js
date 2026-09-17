import { renderSidebarNav, switchView } from '../components/drawer.js';
import { closeLoading, showLoading, showToast } from '../components/modal.js';
import { CACHE_KEY, GAS_API_URL } from '../config.js';
import { getIDBCache, saveToOutboxQueue, setIDBCache } from '../services/idb.js';
import { registerServiceWorkerAndSync, triggerOutboxFlushManual } from '../services/sw-register.js';
import { state } from '../state.js';

export async function loadFromLocalStorage() {
  try {
    const saved = await getIDBCache(CACHE_KEY);
    if (saved) {
      state.cachedData = saved;
      state.isDataLoaded = true;
    }
  } catch (e) {
    console.error('Gagal membaca cache IndexedDB:', e);
  }
}

export async function saveToLocalStorage() {
  try {
    await setIDBCache(CACHE_KEY, state.cachedData);
  } catch (e) {
    console.error('Gagal menyimpan cache IndexedDB:', e);
  }
}

export async function fetchAllInitialData(forceRefresh = false) {
  if (!forceRefresh) {
    loadFromLocalStorage();
    if (state.isDataLoaded) {
      fetchDataFromNetwork();
      return;
    }
  }
  await fetchDataFromNetwork();
}

export async function fetchDataFromNetwork() {
  try {
    const res = await fetch(`${GAS_API_URL}?action=get_all_data`);
    const result = await res.json();
    const data = result.data || result;

    if (data) {
      state.cachedData = {
        users: data.users || [],
        kelas: data.kelas || [],
        pertemuan: data.pertemuan || [],
        materi: data.materi || [],
        lkpd: data.lkpd || [],
        games: data.games || [],
        evaluasi: data.evaluasi || [],
        soal_evaluasi: data.soal_evaluasi || [],
        submissions: data.submissions || [],
        reviews: data.reviews || []
      };
      state.isDataLoaded = true;
      saveToLocalStorage();
      renderSidebarNav();
    }
  } catch (err) {
    console.error('Gagal memuat data dari database:', err);
  }
}

export async function refreshSubmissionsData() {
  try {
    showLoading('Memperbarui data jawaban siswa...');
    const res = await fetch(`${GAS_API_URL}?action=get_submissions`);
    const result = await res.json();
    const data = result.data || result;

    if (Array.isArray(data)) {
      state.cachedData.submissions = data;
      saveToLocalStorage();
      closeLoading();
      showToast('success', 'Data submisi berhasil diperbarui!');

      if (state.currentView === 'guru-koreksi') {
        switchView('guru-koreksi');
      } else if (state.currentView === 'guru-rekap') {
        switchView('guru-rekap');
      }
    } else {
      closeLoading();
      showToast('error', 'Gagal memperbarui data submisi!');
    }
  } catch (err) {
    closeLoading();
    console.error('Error refreshing submissions:', err);
    showToast('error', 'Terjadi kesalahan koneksi internet!');
  }
}

export async function apiPost(payload) {
  const isSubmissionAction = ['submit_lkpd', 'submit_game', 'submit_evaluasi', 'submit_lkpd_isian', 'save_review'].includes(payload.action);

  if (isSubmissionAction) {
    const queueId = 'QUEUE_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    
    await saveToOutboxQueue(queueId, payload);
    
    registerServiceWorkerAndSync();
    triggerOutboxFlushManual();

    return {
      success: true,
      message: '⚡ Tersimpan secara instan di perangkat! Mengirim ke server...',
      instant: true
    };
  }

  try {
    const res = await fetch(GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error('API POST Error:', err);
    return {
      success: false,
      message: 'Gagal terhubung ke server database! Periksa koneksi internet.'
    };
  }
}

// Ekspos ke window agar bisa dipanggil dari atribut onclick/onchange di HTML
window.refreshSubmissionsData = refreshSubmissionsData;
