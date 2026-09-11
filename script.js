/* ==========================================================
   E-LKPD INTERAKTIF STEAM (V2.4 OPTIMIZED LOGIC ENGINE)
   Fitur Baru: Standalone Ruang STEAM Lab & Eksperimen Mandiri Siswa
   ========================================================== */

const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbz-ZUlxuqR0lMQguX64qWJoXP5VwgNucrkPIuYqEOaHGw6OgCA34Nppvhoaq6DlwCd91w/exec';
const CACHE_KEY = 'ELKPD_STEAM_CACHE_DATA_V2';

const state = {
    currentUser: null,
    currentView: 'home',
    activePertemuanId: null,
    isDataLoaded: false,
    cachedData: {
        users: [], kelas: [], pertemuan: [], materi: [],
        lkpd: [], games: [], evaluasi: [], soal_evaluasi: [],
        submissions: [], reviews: []
    },
    evaluasiAnswers: {},
    gameAnswers: {},
    activeGameItems: []
};

/* ==========================================================
   1. SWEETALERT2 UNIFIED NOTIFICATION WRAPPERS
   ========================================================== */
function showToast(icon, title) {
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: icon,
        title: title,
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true
    });
}

function showConfirm(title, text, confirmCallback, confirmBtnText = 'Ya, Lanjutkan') {
    Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#0D6EFD',
        cancelButtonColor: '#64748B',
        confirmButtonText: confirmBtnText,
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed && confirmCallback) {
            confirmCallback();
        }
    });
}

function showLoading(title = 'Memproses data...') {
    Swal.fire({
        title: title,
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });
}

function closeLoading() {
    Swal.close();
}

/* ==========================================================
   2. DATA BATCHING & LOCALSTORAGE CACHING
   ========================================================== */
function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem(CACHE_KEY);
        if (saved) {
            state.cachedData = JSON.parse(saved);
            state.isDataLoaded = true;
        }
    } catch (e) {
        console.error('Gagal membaca cache lokal:', e);
    }
}

function saveToLocalStorage() {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(state.cachedData));
    } catch (e) {
        console.error('Gagal menyimpan cache lokal:', e);
    }
}

async function fetchAllInitialData(forceRefresh = false) {
    if (!forceRefresh) {
        loadFromLocalStorage();
        if (state.isDataLoaded) {
            fetchDataFromNetwork();
            return;
        }
    }

    await fetchDataFromNetwork();
}

async function fetchDataFromNetwork() {
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

async function apiPost(payload) {
    try {
        const res = await fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return await res.json();
    } catch (err) {
        console.error('API POST Error:', err);
        return { success: false, message: 'Gagal terhubung ke server database! Periksa koneksi internet kamu.' };
    }
}

/* ==========================================================
   3. UI HELPER UTILITIES
   ========================================================== */
function openPdfFullscreen(url, title = 'Dokumen PDF') {
    document.getElementById('pdf-fullscreen-title').textContent = title;
    document.getElementById('pdf-fullscreen-iframe').src = url;
    document.getElementById('pdf-fullscreen-external-link').href = url.replace('/preview', '/view');
    const modal = document.getElementById('pdf-fullscreen-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closePdfFullscreenModal() {
    const modal = document.getElementById('pdf-fullscreen-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.getElementById('pdf-fullscreen-iframe').src = '';
}

function requireStudentAuth(actionCallback) {
    if (!state.currentUser) {
        Swal.fire({
            icon: 'info',
            title: 'Akses Terbatas (Mode Guest)',
            text: 'Kamu sedang dalam Mode Guest. Silakan login sebagai Siswa untuk menyimpan jawaban!',
            showCancelButton: true,
            confirmButtonColor: '#0D6EFD',
            cancelButtonColor: '#64748B',
            confirmButtonText: '🔑 Login Siswa',
            cancelButtonText: 'Lanjut Melihat'
        }).then((res) => {
            if (res.isConfirmed) openLoginModal();
        });
        return false;
    }
    if (actionCallback) actionCallback();
    return true;
}

function setButtonLoading(btn, isLoading, loadText = 'Menyimpan...', origText = 'Simpan') {
    if (!btn) return;
    if (isLoading) {
        btn.disabled = true;
        btn.setAttribute('data-orig-text', origText);
        btn.innerHTML = `<span class="inline-block animate-spin mr-1">⏳</span> ${loadText}`;
        btn.classList.add('opacity-75', 'cursor-not-allowed');
    } else {
        btn.disabled = false;
        btn.innerHTML = btn.getAttribute('data-orig-text') || origText;
        btn.classList.remove('opacity-75', 'cursor-not-allowed');
    }
}

function toggleDrawer(isOpen) {
    const drawer = document.getElementById('main-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    if (isOpen) {
        drawer.classList.remove('-translate-x-full');
        backdrop.classList.remove('hidden');
    } else {
        drawer.classList.add('-translate-x-full');
        backdrop.classList.add('hidden');
    }
}

function populateKelasSelects() {
    const kelasList = state.cachedData.kelas || [];
    const optionsHtml = '<option value="-">- (Khusus Guru/Admin)</option>' +
        kelasList.map(k => `<option value="${k.nama_kelas}">${k.nama_kelas}</option>`).join('');

    const userKelasSel = document.getElementById('user-form-kelas');
    if (userKelasSel) userKelasSel.innerHTML = optionsHtml;

    const ptmKelasSel = document.getElementById('pertemuan-form-kelas');
    if (ptmKelasSel) ptmKelasSel.innerHTML = '<option value="ALL">Semua Kelas</option>' +
        kelasList.map(k => `<option value="${k.nama_kelas}">${k.nama_kelas}</option>`).join('');
}

/* ==========================================================
   4. DYNAMIC SIDEBAR NAV RENDERER
   ========================================================== */
function renderSidebarNav() {
    const navContainer = document.getElementById('sidebar-nav');
    if (!navContainer) return;
    navContainer.innerHTML = '';

    if (state.currentUser?.role === 'admin') {
        renderAdminNav(navContainer);
    } else if (state.currentUser?.role === 'guru') {
        renderGuruNav(navContainer);
    } else {
        renderSiswaNav(navContainer);
    }
}

function renderSiswaNav(container) {
    // Menu Beranda
    const homeBtn = document.createElement('button');
    homeBtn.onclick = () => { switchView('home'); toggleDrawer(false); };
    homeBtn.className = `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-heading text-left ${state.currentView === 'home' ? 'bg-brand-yellow text-slate-950 font-extrabold shadow-md' : 'text-slate-300 hover:bg-slate-800'}`;
    homeBtn.innerHTML = `<span>🏠</span><span>Beranda</span>`;
    container.appendChild(homeBtn);

    // Menu Standalone Ruang STEAM
    const steamBtn = document.createElement('button');
    steamBtn.onclick = () => { switchView('ruang-steam'); toggleDrawer(false); };
    steamBtn.className = `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-heading text-left ${state.currentView === 'ruang-steam' ? 'bg-brand-yellow text-slate-950 font-extrabold shadow-md' : 'text-slate-300 hover:bg-slate-800'}`;
    steamBtn.innerHTML = `<span>🎨</span><span>Ruang STEAM Lab</span>`;
    container.appendChild(steamBtn);

    const userKelas = state.currentUser?.kelas || 'ALL';
    const pertemuanList = (state.cachedData.pertemuan || [])
        .filter(p => p.status === 'Publish' && (p.id_kelas === 'ALL' || p.id_kelas === userKelas))
        .sort((a, b) => Number(a.nomor_pertemuan) - Number(b.nomor_pertemuan));

    if (pertemuanList.length > 0) {
        const titleDiv = document.createElement('div');
        titleDiv.className = 'pt-3 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-wider border-t border-slate-800/80';
        titleDiv.textContent = 'MODUL PERTEMUAN';
        container.appendChild(titleDiv);

        pertemuanList.forEach(ptm => {
            const ptmId = ptm.id_pertemuan;

            const hasMateri = state.cachedData.materi.some(m => m.id_pertemuan === ptmId && m.status === 'Publish');
            const hasLkpd = state.cachedData.lkpd.some(l => l.id_pertemuan === ptmId && l.status === 'Publish');
            const hasGame = state.cachedData.games.some(g => g.id_pertemuan === ptmId && g.status === 'Publish');
            const hasEvaluasi = state.cachedData.evaluasi.some(e => e.id_pertemuan === ptmId && e.status === 'Publish');

            const groupWrapper = document.createElement('div');
            groupWrapper.className = 'space-y-1 bg-slate-900/60 p-2 rounded-2xl border border-slate-800/80';

            groupWrapper.innerHTML = `
        <div class="font-bold text-brand-yellow text-[11px] px-2 py-1 uppercase font-heading">
          Pertemuan ${ptm.nomor_pertemuan}: ${ptm.judul_pertemuan}
        </div>
      `;

            if (hasMateri) groupWrapper.appendChild(createSubNavButton(`📖 Bahan Ajar`, () => switchView('materi-ptm', ptmId), state.currentView === 'materi-ptm' && state.activePertemuanId === ptmId));
            if (hasLkpd) groupWrapper.appendChild(createSubNavButton(`📝 LKPD Siswa`, () => switchView('lkpd-ptm', ptmId), state.currentView === 'lkpd-ptm' && state.activePertemuanId === ptmId));
            if (hasGame) groupWrapper.appendChild(createSubNavButton(`🎮 Game Interaktif`, () => switchView('game-ptm', ptmId), state.currentView === 'game-ptm' && state.activePertemuanId === ptmId));
            if (hasEvaluasi) groupWrapper.appendChild(createSubNavButton(`✍️ Evaluasi Kuis`, () => switchView('evaluasi-ptm', ptmId), state.currentView === 'evaluasi-ptm' && state.activePertemuanId === ptmId));

            container.appendChild(groupWrapper);
        });
    }
}

function createSubNavButton(label, onClickFn, isActive) {
    const btn = document.createElement('button');
    btn.onclick = () => { onClickFn(); toggleDrawer(false); };
    btn.className = `w-full text-left px-3 py-1.5 rounded-xl font-medium transition text-[11px] flex items-center justify-between ${isActive ? 'bg-brand-blue text-white font-bold' : 'text-slate-300 hover:bg-slate-800'}`;
    btn.innerHTML = `<span>${label}</span> <span>&rarr;</span>`;
    return btn;
}

function renderGuruNav(container) {
    const menus = [
        { id: 'guru-pertemuan', title: 'Kelola Pertemuan Modul', icon: '📁' },
        { id: 'guru-materi', title: 'Kelola Bahan Ajar', icon: '📖' },
        { id: 'guru-lkpd', title: 'Kelola LKPD Siswa', icon: '📝' },
        { id: 'guru-game', title: 'Kelola Game Interaktif', icon: '🎮' },
        { id: 'guru-soal', title: 'Kelola Evaluasi & Soal', icon: '❓' },
        { id: 'guru-koreksi', title: 'Koreksi LKPD & Nilai', icon: '📊' },
        { id: 'guru-rekap', title: 'Buku Nilai & Rekapitulasi', icon: '🏆' }
    ];

    menus.forEach(m => {
        const btn = document.createElement('button');
        btn.onclick = () => { switchView(m.id); toggleDrawer(false); };
        btn.className = `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-heading text-left ${state.currentView === m.id ? 'bg-brand-yellow text-slate-950 font-extrabold shadow-md' : 'text-slate-300 hover:bg-slate-800'}`;
        btn.innerHTML = `<span>${m.icon}</span><span>${m.title}</span>`;
        container.appendChild(btn);
    });
}

function renderAdminNav(container) {
    const menus = [
        { id: 'admin-users', title: 'Kelola Pengguna', icon: '👥' },
        { id: 'admin-classes', title: 'Kelola Data Kelas', icon: '🏫' }
    ];

    menus.forEach(m => {
        const btn = document.createElement('button');
        btn.onclick = () => { switchView(m.id); toggleDrawer(false); };
        btn.className = `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-heading text-left ${state.currentView === m.id ? 'bg-brand-yellow text-slate-950 font-extrabold shadow-md' : 'text-slate-300 hover:bg-slate-800'}`;
        btn.innerHTML = `<span>${m.icon}</span><span>${m.title}</span>`;
        container.appendChild(btn);
    });
}

/* ==========================================================
   5. VIEW ROUTER ENGINE
   ========================================================== */
async function switchView(viewId, paramId = null) {
    state.currentView = viewId;
    state.activePertemuanId = paramId;

    const viewport = document.getElementById('content-viewport');
    const titleElem = document.getElementById('view-title');

    if (!state.isDataLoaded) {
        viewport.innerHTML = `<div class="p-8 text-center text-xs font-bold text-slate-500">Memuat data dari database...</div>`;
        await fetchAllInitialData();
    }

    renderSidebarNav();

    switch (viewId) {
        case 'home':
            titleElem.textContent = 'BERANDA & DOKUMENTASI';
            viewport.innerHTML = renderHomeView();
            break;

        case 'ruang-steam':
            titleElem.textContent = 'RUANG EKSPERIMEN & LAB STEAM';
            viewport.innerHTML = renderRuangSteamView();
            setTimeout(() => initStandaloneSteamCanvas(), 100);
            break;

        case 'materi-ptm':
            titleElem.textContent = 'BAHAN AJAR MATERI';
            viewport.innerHTML = renderMateriView(paramId);
            break;

        case 'lkpd-ptm':
            titleElem.textContent = 'LEMBAR KERJA PESERTA DIDIK (LKPD)';
            viewport.innerHTML = renderLkpdView(paramId);
            setTimeout(() => {
                initCanvas();
                const qCount = document.querySelectorAll(`[id^="lkpd-ans-"]`).length;
                loadLkpdDraft(paramId, qCount);
            }, 150);
            break;

        case 'game-ptm':
            titleElem.textContent = 'GAME INTERAKTIF PEMBELAJARAN';
            viewport.innerHTML = renderGameView(paramId);
            break;

        case 'evaluasi-ptm':
            titleElem.textContent = 'EVALUASI PEMBELAJARAN';
            viewport.innerHTML = renderEvaluasiView(paramId);
            break;

        case 'admin-users':
            titleElem.textContent = 'KELOLA PENGGUNA SISTEM';
            renderAdminUsersView(viewport);
            break;

        case 'admin-classes':
            titleElem.textContent = 'KELOLA DATA KELAS';
            renderAdminClassesView(viewport);
            break;

        case 'guru-pertemuan':
            titleElem.textContent = 'KELOLA PERTEMUAN PEMBELAJARAN';
            renderGuruPertemuanView(viewport);
            break;

        case 'guru-materi':
            titleElem.textContent = 'KELOLA BAHAN AJAR';
            renderGuruMateriView(viewport);
            break;

        case 'guru-lkpd':
            titleElem.textContent = 'KELOLA LKPD SISWA';
            renderGuruLkpdView(viewport);
            break;

        case 'guru-game':
            titleElem.textContent = 'KELOLA GAME INTERAKTIF';
            renderGuruGameView(viewport);
            break;

        case 'guru-soal':
            titleElem.textContent = 'KELOLA EVALUASI & BANK SOAL';
            renderGuruSoalView(viewport);
            break;

        case 'guru-koreksi':
            titleElem.textContent = 'KOREKSI JAWABAN SISWA';
            renderGuruKoreksiView(viewport);
            break;

        case 'guru-rekap':
            titleElem.textContent = 'BUKU NILAI & REKAPITULASI';
            renderGuruRekapView(viewport);
            break;

        default:
            switchView('home');
    }

    if (window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise().catch((err) => console.log('MathJax typeset info:', err));
    }
}

/* ==========================================================
   6. SISWA VIEWS & STANDALONE STEAM LAB
   ========================================================== */
function renderHomeView() {
    return `
    <div class="space-y-4 max-w-4xl mx-auto text-xs">
      <div class="bg-gradient-to-r from-brand-navy to-blue-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-3">
        <span class="px-3 py-1 bg-brand-yellow text-brand-navy font-black text-[10px] rounded-full uppercase tracking-wider font-heading">
          UNIVERSITAS NEGERI GORONTALO
        </span>
        <h2 class="text-2xl sm:text-3xl font-black font-heading leading-tight">
          E-LKPD INTERAKTIF BERBASIS STEAM
        </h2>
        <p class="text-xs text-slate-300 max-w-xl leading-relaxed">
          Platform Digital interaktif berbasis Science, Technology, Engineering, Arts, dan Mathematics. Pilih modul pada menu sidebar untuk memulai aktivitas pembelajaran.
        </p>
      </div>
    </div>
  `;
}

/* ==========================================================
   RUANG STEAM LAB (DENGAN INTEGRASI PERTEMUAN MODUL)
   ========================================================== */

function renderRuangSteamView() {
    // Mengambil daftar pertemuan yang dipublikasikan
    const userKelas = state.currentUser?.kelas || 'ALL';
    const pertemuanList = (state.cachedData.pertemuan || [])
        .filter(p => p.status === 'Publish' && (p.id_kelas === 'ALL' || p.id_kelas === userKelas))
        .sort((a, b) => Number(a.nomor_pertemuan) - Number(b.nomor_pertemuan));

    const optionsHtml = pertemuanList.length > 0 
        ? pertemuanList.map(p => `<option value="${p.id_pertemuan}">Pertemuan ${p.nomor_pertemuan}: ${p.judul_pertemuan}</option>`).join('')
        : '<option value="">-- Belum ada pertemuan aktif --</option>';

    const defaultPtm = pertemuanList[0] || null;

    return `
    <div class="max-w-5xl mx-auto space-y-5 text-xs">
      <!-- Header Banner Ruang STEAM -->
      <div class="bg-gradient-to-r from-purple-900 via-brand-navy to-blue-900 text-white p-6 rounded-3xl shadow-xl space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-800/60 pb-3">
          <div>
            <span class="px-3 py-1 bg-purple-500/30 text-purple-200 border border-purple-400/30 rounded-full text-[10px] uppercase font-mono font-bold">
              Laboratorium Kreatif & Eksperimen
            </span>
            <h2 class="text-xl sm:text-2xl font-black font-heading mt-1">RUANG EKSPERIMEN STEAM</h2>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="downloadSteamCanvasImage()" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition">
              💾 Unduh PNG
            </button>
            <button id="btn-submit-steam-lab" onclick="requireStudentAuth(() => submitSteamLabToTeacher())" class="px-4 py-2 bg-brand-emerald hover:bg-emerald-600 text-white font-black rounded-xl shadow transition">
              🚀 Kirim ke Guru
            </button>
          </div>
        </div>

        <!-- Pemilih Pertemuan Target -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-center bg-slate-900/80 p-3.5 rounded-2xl border border-purple-500/30">
          <div>
            <label class="block font-black text-brand-yellow uppercase text-[10px] tracking-wider mb-1">
              Fokus Pertemuan Modul:
            </label>
            <select id="steam-select-pertemuan" onchange="updateSteamPertemuanInfo(this.value)" class="w-full p-2.5 rounded-xl border-0 bg-slate-800 text-white font-bold text-xs focus:ring-2 focus:ring-purple-400 focus:outline-none">
              ${optionsHtml}
            </select>
          </div>
          <div class="md:col-span-2 text-slate-300 text-[11px] border-t md:border-t-0 md:border-l border-slate-700 pt-2 md:pt-0 md:pl-3">
            <span class="font-bold text-white block">Capaian & Fokus Topik:</span>
            <p id="steam-pertemuan-deskripsi" class="text-slate-300 font-medium mt-0.5">
              ${defaultPtm ? defaultPtm.deskripsi || 'Silakan pilih modul pertemuan di samping.' : 'Belum ada modul tersedia.'}
            </p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- Area Kanvas Gambar -->
        <div class="lg:col-span-2 bg-white p-5 rounded-3xl border shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b pb-3">
            <h3 class="font-black text-brand-navy text-sm font-heading">Kanvas Lukis & Prototyping</h3>
            <span id="steam-canvas-badge-ptm" class="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full font-bold">
              ${defaultPtm ? `Pertemuan ${defaultPtm.nomor_pertemuan}` : 'Mode Bebas'}
            </span>
          </div>

          <!-- Toolbar Pengatur Alat Gambar -->
          <div class="p-3 bg-slate-50 border rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-bold text-slate-500 mr-1">Warna:</span>
              <button onclick="setStandaloneCanvasColor('#0B2545')" class="w-6 h-6 rounded-full bg-brand-navy border-2 border-white shadow-xs hover:scale-110 transition" title="Biru Tua"></button>
              <button onclick="setStandaloneCanvasColor('#EF4444')" class="w-6 h-6 rounded-full bg-red-500 border-2 border-white shadow-xs hover:scale-110 transition" title="Merah"></button>
              <button onclick="setStandaloneCanvasColor('#10B981')" class="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-xs hover:scale-110 transition" title="Hijau"></button>
              <button onclick="setStandaloneCanvasColor('#6B38FB')" class="w-6 h-6 rounded-full bg-purple-600 border-2 border-white shadow-xs hover:scale-110 transition" title="Ungu"></button>
              <button onclick="setStandaloneCanvasColor('#F59E0B')" class="w-6 h-6 rounded-full bg-amber-500 border-2 border-white shadow-xs hover:scale-110 transition" title="Kuning"></button>
              <button onclick="setStandaloneCanvasColor('#000000')" class="w-6 h-6 rounded-full bg-black border-2 border-white shadow-xs hover:scale-110 transition" title="Hitam"></button>
              <button onclick="setStandaloneCanvasColor('#FFFFFF')" class="w-6 h-6 rounded-full bg-white border-2 border-slate-300 shadow-xs hover:scale-110 transition flex items-center justify-center text-[9px]" title="Penghapus">🧹</button>
            </div>

            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-bold text-slate-500">Kuas:</span>
              <button onclick="setStandaloneCanvasSize(2)" class="px-2 py-0.5 bg-white border rounded-lg text-[10px] font-bold hover:bg-slate-100">Halus</button>
              <button onclick="setStandaloneCanvasSize(5)" class="px-2 py-0.5 bg-white border rounded-lg text-[10px] font-bold hover:bg-slate-100">Sedang</button>
              <button onclick="setStandaloneCanvasSize(10)" class="px-2 py-0.5 bg-white border rounded-lg text-[10px] font-bold hover:bg-slate-100">Tebal</button>
            </div>

            <div class="flex items-center gap-1.5">
              <button onclick="undoStandaloneCanvas()" class="px-3 py-1 bg-amber-100 text-amber-800 font-bold rounded-xl text-[10px] hover:bg-amber-200 transition">Undo</button>
              <button onclick="clearStandaloneCanvas()" class="px-3 py-1 bg-red-100 text-red-700 font-bold rounded-xl text-[10px] hover:bg-red-200 transition">Clear</button>
            </div>
          </div>

          <div class="border-2 border-dashed border-slate-300 bg-white rounded-3xl overflow-hidden shadow-inner">
            <canvas id="ruang-steam-canvas" class="w-full h-[380px] cursor-crosshair touch-none bg-white"></canvas>
          </div>
        </div>

        <!-- Kolom Catatan Ide & Konsep STEAM -->
        <div class="bg-white p-5 rounded-3xl border shadow-sm space-y-4">
          <h3 class="font-black text-brand-navy text-sm font-heading border-b pb-2">Catatan Ide Proyek</h3>

          <div class="space-y-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Judul / Topik Eksperimen</label>
              <input type="text" id="steam-note-title" placeholder="Contoh: Rancangan Katrol Sederhana" class="w-full p-2.5 rounded-xl border font-bold text-brand-navy focus:ring-2 focus:ring-purple-500 focus:outline-none" />
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">Konsep Science & Technology</label>
              <textarea id="steam-note-science" rows="2" placeholder="Jelaskan fenomena sains/teknologi yang melandasi gambar kamu..." class="w-full p-2.5 rounded-xl border text-[11px] font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"></textarea>
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">Konsep Engineering & Math</label>
              <textarea id="steam-note-engineering" rows="2" placeholder="Jelaskan rancangan struktur, ukuran, atau perhitungan matematika..." class="w-full p-2.5 rounded-xl border text-[11px] font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Fungsi pembantu memperbarui informasi saat dropdown pertemuan diganti
function updateSteamPertemuanInfo(ptmId) {
    const ptmList = state.cachedData.pertemuan || [];
    const ptm = ptmList.find(p => p.id_pertemuan === ptmId);

    const descElem = document.getElementById('steam-pertemuan-deskripsi');
    const badgeElem = document.getElementById('steam-canvas-badge-ptm');

    if (ptm) {
        if (descElem) descElem.textContent = ptm.deskripsi || 'Tidak ada deskripsi khusus.';
        if (badgeElem) badgeElem.textContent = `Pertemuan ${ptm.nomor_pertemuan}`;
    } else {
        if (descElem) descElem.textContent = 'Pilih modul pertemuan di atas.';
        if (badgeElem) badgeElem.textContent = 'Mode Bebas';
    }
}

// Fungsi mengirim karya Ruang STEAM ke database guru
async function submitSteamLabToTeacher() {
    const ptmId = document.getElementById('steam-select-pertemuan')?.value;
    if (!ptmId) {
        showToast('warning', 'Pilih pertemuan target terlebih dahulu!');
        return;
    }

    const title = document.getElementById('steam-note-title')?.value || 'Sketsa Eksperimen STEAM';
    const sci = document.getElementById('steam-note-science')?.value || '';
    const eng = document.getElementById('steam-note-engineering')?.value || '';

    const canvas = document.getElementById('ruang-steam-canvas');
    const canvasBase64 = canvas ? canvas.toDataURL('image/png') : '';

    const btn = document.getElementById('btn-submit-steam-lab');
    setButtonLoading(btn, true, 'Mengirim...', '🚀 Kirim ke Guru');

    const res = await apiPost({
        action: 'submit_lkpd',
        id_pertemuan: ptmId,
        username_siswa: state.currentUser.username,
        nama_siswa: state.currentUser.name,
        kelas: state.currentUser.kelas,
        jawaban_json: [
            `[RUANG STEAM LAB] Judul: ${title}`,
            `Science & Tech: ${sci}`,
            `Engineering & Math: ${eng}`
        ],
        canvas_image_base64: canvasBase64
    });

    setButtonLoading(btn, false, '', '🚀 Kirim ke Guru');

    if (res.success) {
        await fetchAllInitialData(true);
        showToast('success', 'Karya STEAM berhasil dikirim ke guru!');
    } else {
        Swal.fire({ icon: 'error', title: 'Gagal Mengirim', text: res.message });
    }
}

function renderMateriView(ptmId) {
    const materiList = (state.cachedData.materi || []).filter(m => m.id_pertemuan === ptmId && m.status === 'Publish');
    if (materiList.length === 0) return `<div class="p-8 text-center text-slate-400">Belum ada bahan ajar pada pertemuan ini.</div>`;

    return `
    <div class="max-w-4xl mx-auto space-y-4 text-xs">
      ${materiList.map(m => `
        <div class="bg-white p-5 rounded-3xl border shadow-xs space-y-3">
          <h3 class="font-black text-brand-navy text-sm font-heading border-b pb-2">${m.judul_materi}</h3>
          ${m.isi_teks ? `<p class="text-slate-700 leading-relaxed font-medium whitespace-pre-line">${m.isi_teks}</p>` : ''}
          ${m.tipe_media === 'pdf_document' && m.file_pdf_url ? `
            <div class="space-y-2 mt-2">
              <div class="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-2xl">
                <span class="font-bold text-brand-navy text-[11px]">📄 Dokumen Bahan Ajar PDF</span>
                <div class="flex items-center gap-1.5">
                  <button onclick="openPdfFullscreen('${m.file_pdf_url}', '${m.judul_materi}')" class="px-3 py-1.5 bg-brand-navy hover:bg-slate-800 text-white font-bold rounded-xl text-[11px] transition shadow">
                    🖥️ Layar Penuh (Fullscreen)
                  </button>
                  <a href="${m.file_pdf_url.replace('/preview', '/view')}" target="_blank" class="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-[11px] transition">
                    🔗 Tab Baru
                  </a>
                </div>
              </div>
              <div class="bg-slate-900 rounded-2xl overflow-hidden h-[550px] relative border">
                <iframe src="${m.file_pdf_url}" class="w-full h-full border-0" allow="fullscreen"></iframe>
              </div>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function renderLkpdView(ptmId) {
    const lkpdObj = (state.cachedData.lkpd || []).find(l => l.id_pertemuan === ptmId && l.status === 'Publish');
    if (!lkpdObj) return `<div class="p-8 text-center text-slate-400">LKPD belum tersedia pada pertemuan ini.</div>`;

    let questions = [];
    try { questions = typeof lkpdObj.soal_json === 'string' ? JSON.parse(lkpdObj.soal_json) : lkpdObj.soal_json; } catch (e) { }

    const questionCount = Math.max(questions.length, 1);

    return `
    <div class="max-w-4xl mx-auto space-y-4 text-xs">
      <div class="bg-white p-5 rounded-3xl border shadow-sm space-y-3">
        <h3 class="font-black text-brand-navy text-sm font-heading border-b pb-2">${lkpdObj.judul_lkpd}</h3>
        <p class="text-slate-600 font-medium">${lkpdObj.instruksi}</p>
      </div>

      ${lkpdObj.tipe_lkpd === 'pdf' && lkpdObj.file_pdf_url ? `
        <div class="bg-white p-5 rounded-3xl border shadow-sm space-y-3">
          <div class="flex items-center justify-between border-b pb-2">
            <h4 class="font-black text-brand-navy">📄 Lembar Kerja PDF</h4>
            <div class="flex items-center gap-1.5">
              <button onclick="openPdfFullscreen('${lkpdObj.file_pdf_url}', '${lkpdObj.judul_lkpd}')" class="px-3 py-1.5 bg-brand-navy hover:bg-slate-800 text-white font-bold rounded-xl text-[11px] transition shadow">
                🖥️ Layar Penuh (Fullscreen)
              </button>
              <a href="${lkpdObj.file_pdf_url.replace('/preview', '/view')}" target="_blank" class="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-[11px] transition">
                🔗 Tab Baru
              </a>
            </div>
          </div>
          <div class="bg-slate-900 rounded-2xl overflow-hidden h-[550px] relative border">
            <iframe src="${lkpdObj.file_pdf_url}" class="w-full h-full border-0" allow="fullscreen"></iframe>
          </div>
        </div>
      ` : ''}

      ${lkpdObj.gambar_url ? `
        <div class="bg-white p-5 rounded-3xl border shadow-sm space-y-2">
          <h4 class="font-black text-brand-navy border-b pb-2">🖼️ Visual Ilustrasi LKPD</h4>
          <img src="${lkpdObj.gambar_url}" alt="Visual LKPD" class="max-h-96 rounded-2xl border mx-auto object-contain bg-slate-50" />
        </div>
      ` : ''}

      <div class="bg-white p-5 rounded-3xl border shadow-sm space-y-4">
        <div class="flex items-center justify-between border-b pb-2">
          <h4 class="font-black text-brand-navy">✍️ Lembar Jawaban Siswa</h4>
          <span class="text-[10px] bg-blue-50 text-brand-blue border border-blue-200 px-2.5 py-0.5 rounded-full font-bold">💾 Auto-Save Draft Aktif</span>
        </div>
        ${questions.length > 0 ? questions.map((q, idx) => `
          <div class="space-y-1">
            <label class="block font-bold text-slate-800">${idx + 1}. ${q}</label>
            <textarea id="lkpd-ans-${idx}" oninput="saveLkpdDraft('${ptmId}', ${questionCount})" rows="2" class="w-full p-2.5 rounded-xl border font-medium focus:ring-2 focus:ring-brand-blue focus:outline-none" placeholder="Tuliskan jawaban kamu..."></textarea>
          </div>
        `).join('') : `
          <div class="space-y-1">
            <label class="block font-bold text-slate-800">Tuliskan hasil pengerjaan/jawaban LKPD kamu di bawah ini:</label>
            <textarea id="lkpd-ans-0" oninput="saveLkpdDraft('${ptmId}', ${questionCount})" rows="5" class="w-full p-2.5 rounded-xl border font-medium focus:ring-2 focus:ring-brand-blue focus:outline-none" placeholder="Tuliskan jawaban kamu secara lengkap..."></textarea>
          </div>
        `}
      </div>

      ${lkpdObj.fitur_kanvas === 'TRUE' ? `
        <div class="bg-white p-5 rounded-3xl border shadow-sm space-y-3">
          <h4 class="font-black text-brand-navy border-b pb-2">🎨 Kanvas Gambar Proyek STEAM</h4>
          <div class="flex items-center justify-between p-2 bg-slate-50 rounded-2xl border">
            <div class="flex items-center gap-1.5">
              <button onclick="setCanvasColor('#0B2545')" class="w-6 h-6 rounded-full bg-brand-navy border-2 border-white shadow-xs" title="Biru Tua"></button>
              <button onclick="setCanvasColor('#EF4444')" class="w-6 h-6 rounded-full bg-red-500 border-2 border-white shadow-xs" title="Merah"></button>
              <button onclick="setCanvasColor('#10B981')" class="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-xs" title="Hijau"></button>
              <button onclick="setCanvasColor('#6B38FB')" class="w-6 h-6 rounded-full bg-purple-600 border-2 border-white shadow-xs" title="Ungu"></button>
            </div>
            <div class="flex items-center gap-1.5">
              <button onclick="undoCanvas()" class="px-3 py-1 bg-amber-100 text-amber-800 font-bold rounded-xl text-[10px] hover:bg-amber-200 transition">↩️ Urungkan (Undo)</button>
              <button onclick="clearCanvas()" class="px-3 py-1 bg-red-100 text-red-700 font-bold rounded-xl text-[10px] hover:bg-red-200 transition">🗑️ Bersihkan</button>
            </div>
          </div>
          <div class="border-2 border-dashed border-slate-300 bg-white rounded-3xl overflow-hidden">
            <canvas id="steam-canvas" class="w-full h-[240px] cursor-crosshair touch-none"></canvas>
          </div>
        </div>
      ` : ''}

      <button id="btn-submit-lkpd-siswa" onclick="requireStudentAuth(() => submitLkpdSiswa('${ptmId}', ${questionCount}))" class="w-full py-3.5 bg-brand-emerald text-white font-black rounded-2xl shadow hover:bg-emerald-600 transition">
        🚀 Kirim Jawaban LKPD
      </button>
    </div>
  `;
}

function renderGameView(ptmId) {
    const gameObj = (state.cachedData.games || []).find(g => g.id_pertemuan === ptmId && g.status === 'Publish');
    if (!gameObj) return `<div class="p-8 text-center text-slate-400">Game belum tersedia pada pertemuan ini.</div>`;

    let config = { items: [] };
    try { config = typeof gameObj.konfigurasi_json === 'string' ? JSON.parse(gameObj.konfigurasi_json) : gameObj.konfigurasi_json; } catch (e) { }

    const items = config.items || [];
    state.activeGameItems = items;
    const tipe = gameObj.tipe_game || 'matching';

    return `
    <div class="max-w-4xl mx-auto space-y-4 text-xs">
      <div class="bg-gradient-to-r from-purple-900 to-brand-navy text-white p-5 rounded-3xl shadow-md">
        <span class="px-3 py-0.5 bg-purple-500/40 text-purple-200 border border-purple-400/30 rounded-full text-[10px] uppercase font-mono font-bold">${tipe}</span>
        <h3 class="text-base font-black font-heading mt-1">${gameObj.judul_game}</h3>
        <p class="text-xs text-purple-200 mt-1">${gameObj.instruksi}</p>
      </div>

      ${renderGameInteractiveBody(tipe, items, ptmId)}
    </div>
  `;
}

function renderGameInteractiveBody(tipe, items, ptmId) {
    state.gameAnswers = {};

    if (tipe === 'matching') {
        return `
      <div class="space-y-3">
        ${items.map((item, idx) => `
          <div class="bg-white p-4 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p class="font-bold text-slate-800">${idx + 1}. ${item.soal}</p>
            <div class="flex items-center gap-2 w-full sm:w-64">
              <input type="text" id="gm-input-${idx}" onchange="state.gameAnswers[${idx}] = this.value" placeholder="Pasangan..." class="w-full p-2.5 rounded-xl border font-bold text-brand-blue" />
            </div>
          </div>
        `).join('')}
        <button id="btn-submit-game-siswa" onclick="requireStudentAuth(() => submitGameSiswa('${ptmId}', 'matching'))" class="w-full py-3.5 bg-purple-600 text-white font-black rounded-2xl shadow hover:bg-purple-700 transition">
          🎮 Periksa & Simpan Skor Game
        </button>
      </div>
    `;
    } else if (tipe === 'drag_drop') {
        const cat1 = items[0]?.kategori_a || 'Kategori A';
        const cat2 = items[0]?.kategori_b || 'Kategori B';

        return `
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-blue-50 border-2 border-dashed border-blue-300 p-3 rounded-2xl text-center">
            <span class="font-black text-brand-blue block uppercase font-heading">${cat1}</span>
          </div>
          <div class="bg-purple-50 border-2 border-dashed border-purple-300 p-3 rounded-2xl text-center">
            <span class="font-black text-purple-600 block uppercase font-heading">${cat2}</span>
          </div>
        </div>

        ${items.map((item, idx) => `
          <div class="bg-white p-4 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p class="font-bold text-slate-800">${idx + 1}. ${item.soal}</p>
            <div class="flex items-center gap-2 w-full sm:w-64">
              <button id="gm-cat-${idx}-A" onclick="setDragDropChoice(${idx}, 'A')" class="flex-1 py-2 bg-slate-100 font-bold rounded-xl text-xs">${cat1}</button>
              <button id="gm-cat-${idx}-B" onclick="setDragDropChoice(${idx}, 'B')" class="flex-1 py-2 bg-slate-100 font-bold rounded-xl text-xs">${cat2}</button>
            </div>
          </div>
        `).join('')}

        <button id="btn-submit-game-siswa" onclick="requireStudentAuth(() => submitGameSiswa('${ptmId}', 'drag_drop'))" class="w-full py-3.5 bg-purple-600 text-white font-black rounded-2xl shadow hover:bg-purple-700 transition">
          🎮 Periksa & Simpan Skor Game
        </button>
      </div>
    `;
    } else {
        return `
      <div class="space-y-3">
        ${items.map((item, idx) => `
          <div class="bg-white p-4 rounded-3xl border space-y-2">
            <p class="font-bold text-slate-800">${idx + 1}. ${item.soal}</p>
            <div class="grid grid-cols-2 gap-2">
              <button id="gm-quiz-${idx}-A" onclick="setQuizChoice(${idx}, 'A')" class="p-2.5 rounded-xl border bg-slate-50 font-bold text-left">A. ${item.opsi_a || 'Pilihan A'}</button>
              <button id="gm-quiz-${idx}-B" onclick="setQuizChoice(${idx}, 'B')" class="p-2.5 rounded-xl border bg-slate-50 font-bold text-left">B. ${item.opsi_b || 'Pilihan B'}</button>
            </div>
          </div>
        `).join('')}

        <button id="btn-submit-game-siswa" onclick="requireStudentAuth(() => submitGameSiswa('${ptmId}', 'quiz_speed'))" class="w-full py-3.5 bg-purple-600 text-white font-black rounded-2xl shadow hover:bg-purple-700 transition">
          🎮 Periksa & Simpan Skor Game
        </button>
      </div>
    `;
    }
}

function setDragDropChoice(idx, choice) {
    state.gameAnswers[idx] = choice;
    const btnA = document.getElementById(`gm-cat-${idx}-A`);
    const btnB = document.getElementById(`gm-cat-${idx}-B`);
    if (choice === 'A') {
        btnA.className = 'flex-1 py-2 bg-brand-blue text-white font-bold rounded-xl text-xs';
        btnB.className = 'flex-1 py-2 bg-slate-100 font-bold rounded-xl text-xs';
    } else {
        btnA.className = 'flex-1 py-2 bg-slate-100 font-bold rounded-xl text-xs';
        btnB.className = 'flex-1 py-2 bg-purple-600 text-white font-bold rounded-xl text-xs';
    }
}

function setQuizChoice(idx, choice) {
    state.gameAnswers[idx] = choice;
    const btnA = document.getElementById(`gm-quiz-${idx}-A`);
    const btnB = document.getElementById(`gm-quiz-${idx}-B`);
    if (choice === 'A') {
        btnA.className = 'p-2.5 rounded-xl border-2 border-brand-blue bg-blue-50 font-bold text-brand-blue text-left';
        btnB.className = 'p-2.5 rounded-xl border bg-slate-50 font-bold text-left';
    } else {
        btnA.className = 'p-2.5 rounded-xl border bg-slate-50 font-bold text-left';
        btnB.className = 'p-2.5 rounded-xl border-2 border-purple-600 bg-purple-50 font-bold text-purple-600 text-left';
    }
}

function renderEvaluasiView(ptmId) {
    const evalObj = (state.cachedData.evaluasi || []).find(e => e.id_pertemuan === ptmId && e.status === 'Publish');
    if (!evalObj) return `<div class="p-8 text-center text-slate-400">Evaluasi belum tersedia pada pertemuan ini.</div>`;

    const soalList = (state.cachedData.soal_evaluasi || []).filter(s => s.id_evaluasi === evalObj.id_evaluasi);
    if (soalList.length === 0) return `<div class="p-8 text-center text-slate-400">Belum ada soal pada modul evaluasi ini.</div>`;

    return `
    <div class="max-w-4xl mx-auto space-y-4 text-xs">
      <div class="bg-brand-navy text-white p-5 rounded-3xl shadow-md">
        <h3 class="text-base font-black font-heading">${evalObj.judul_evaluasi}</h3>
        <span class="text-[11px] text-slate-300">Durasi: ${evalObj.durasi_menit} Menit | Total: ${soalList.length} Soal</span>
      </div>

      <div class="space-y-4">
        ${soalList.map((s, idx) => `
          <div class="bg-white p-5 rounded-3xl border space-y-3">
            <span class="font-black text-brand-navy">Soal #${idx + 1}</span>
            <p class="font-bold text-slate-800">${s.pertanyaan}</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              ${['A', 'B', 'C', 'D'].map(o => `
                <button id="eval-opt-${s.id_soal}-${o}" onclick="selectEvalOption('${s.id_soal}', '${o}')" class="w-full p-3 text-left rounded-2xl border bg-white hover:bg-slate-50 font-medium transition flex items-center gap-2">
                  <span class="w-6 h-6 rounded-xl bg-slate-100 font-black text-[10px] flex items-center justify-center border">${o}</span>
                  <span>${s['opsi_' + o.toLowerCase()]}</span>
                </button>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>

      <button id="btn-submit-eval-siswa" onclick="requireStudentAuth(() => submitEvaluasiSiswa('${ptmId}', '${evalObj.id_evaluasi}'))" class="w-full py-4 bg-brand-emerald text-white font-black rounded-2xl shadow hover:bg-emerald-600 transition">
        🚀 Kirim Jawaban Evaluasi & Hitung Skor
      </button>
    </div>
  `;
}

function selectEvalOption(soalId, option) {
    state.evaluasiAnswers[soalId] = option;
    ['A', 'B', 'C', 'D'].forEach(o => {
        const btn = document.getElementById(`eval-opt-${soalId}-${o}`);
        if (btn) btn.className = state.evaluasiAnswers[soalId] === o ? 'w-full p-3 text-left rounded-2xl border-2 border-brand-blue bg-blue-50 font-bold text-brand-blue' : 'w-full p-3 text-left rounded-2xl border bg-white font-medium';
    });
}

/* ==========================================================
   7. ADMIN CMS VIEWS
   ========================================================== */
function renderAdminUsersView(container) {
    const usersList = state.cachedData.users || [];
    container.innerHTML = `
    <div class="space-y-4 text-xs">
      <div class="flex items-center justify-between bg-white p-4 rounded-2xl border shadow-xs">
        <span class="font-bold text-slate-700">Total Pengguna: <b>${usersList.length}</b></span>
        <button onclick="openUserModal()" class="px-4 py-2 bg-brand-blue text-white font-bold rounded-xl shadow">+ Tambah Pengguna</button>
      </div>
      <div class="bg-white p-4 rounded-3xl border shadow-sm overflow-x-auto">
        <table class="w-full text-left">
          <thead class="bg-brand-navy text-white font-heading">
            <tr>
              <th class="p-3">Nama Lengkap</th>
              <th class="p-3">Username</th>
              <th class="p-3">Role</th>
              <th class="p-3">Kelas</th>
              <th class="p-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${usersList.map(u => `
              <tr>
                <td class="p-3 font-bold">${u.nama_lengkap}</td>
                <td class="p-3 font-mono">${u.username}</td>
                <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${u.role === 'admin' ? 'bg-red-100 text-red-700' : u.role === 'guru' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">${String(u.role).toUpperCase()}</span></td>
                <td class="p-3 font-bold">${u.kelas || '-'}</td>
                <td class="p-3 text-center">
                  <button onclick="deleteUser('${u.user_id}')" class="px-3 py-1 bg-red-100 text-red-700 font-bold rounded-lg hover:bg-red-200">Hapus</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAdminClassesView(container) {
    const kelasList = state.cachedData.kelas || [];
    container.innerHTML = `
    <div class="space-y-4 text-xs">
      <div class="flex items-center justify-between bg-white p-4 rounded-2xl border shadow-xs">
        <span class="font-bold text-slate-700">Total Kelas Registered: <b>${kelasList.length}</b></span>
        <button onclick="openKelasModal()" class="px-4 py-2 bg-brand-blue text-white font-bold rounded-xl shadow">+ Tambah Kelas</button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        ${kelasList.map(k => `
          <div class="bg-white p-4 rounded-3xl border flex items-center justify-between shadow-xs">
            <div>
              <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">Tingkat ${k.tingkat || '-'}</span>
              <h4 class="font-black text-brand-navy text-sm mt-1">${k.nama_kelas}</h4>
              <p class="text-slate-500 text-[11px]">${k.keterangan || ''}</p>
            </div>
            <button onclick="deleteKelas('${k.id_kelas}')" class="px-3 py-1 bg-red-100 text-red-700 rounded-lg font-bold hover:bg-red-200">Hapus</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/* ==========================================================
   8. GURU CMS VIEWS & EKSPOR REKAP CSV
   ========================================================== */
function renderGuruPertemuanView(container) {
    const ptmList = state.cachedData.pertemuan || [];
    container.innerHTML = `
    <div class="space-y-4 text-xs">
      <div class="flex items-center justify-between bg-white p-4 rounded-2xl border shadow-xs">
        <span class="font-bold text-slate-700">Total Modul Pertemuan: <b>${ptmList.length}</b></span>
        <button onclick="openPertemuanModal()" class="px-4 py-2 bg-brand-blue text-white font-bold rounded-xl shadow">+ Tambah Pertemuan</button>
      </div>
      <div class="space-y-2">
        ${ptmList.map(p => `
          <div class="bg-white p-4 rounded-3xl border flex items-center justify-between">
            <div>
              <span class="px-2 py-0.5 bg-blue-100 text-brand-blue font-black rounded-full text-[10px]">Pertemuan ${p.nomor_pertemuan}</span>
              <h4 class="font-black text-brand-navy text-xs mt-1">${p.judul_pertemuan}</h4>
              <p class="text-slate-500 text-[11px]">${p.deskripsi}</p>
            </div>
            <div class="space-x-1">
              <button onclick="deletePertemuan('${p.id_pertemuan}')" class="px-3 py-1 bg-red-100 text-red-700 rounded-lg font-bold">Hapus</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderGuruMateriView(container) {
    const materiList = state.cachedData.materi || [];
    container.innerHTML = `
    <div class="space-y-4 text-xs">
      <div class="flex items-center justify-between bg-white p-4 rounded-2xl border shadow-xs">
        <span class="font-bold text-slate-700">Total Bahan Ajar: <b>${materiList.length}</b></span>
        <button onclick="openMateriModal()" class="px-4 py-2 bg-brand-blue text-white font-bold rounded-xl shadow">+ Tambah Bahan Ajar</button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        ${materiList.map(m => `
          <div class="bg-white p-4 rounded-3xl border flex flex-col justify-between space-y-2">
            <div>
              <span class="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold text-[10px] rounded-full">${m.tipe_media}</span>
              <h4 class="font-black text-brand-navy mt-1">${m.judul_materi}</h4>
            </div>
            <div class="flex justify-end gap-1 pt-2 border-t">
              <button onclick="deleteMateri('${m.id_materi}')" class="px-3 py-1 bg-red-100 text-red-700 rounded-lg font-bold">Hapus</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderGuruLkpdView(container) {
    const lkpdList = state.cachedData.lkpd || [];
    container.innerHTML = `
    <div class="space-y-4 text-xs">
      <div class="flex items-center justify-between bg-white p-4 rounded-2xl border shadow-xs">
        <span class="font-bold text-slate-700">Total LKPD Aktif: <b>${lkpdList.length}</b></span>
        <button onclick="openLkpdModal()" class="px-4 py-2 bg-brand-blue text-white font-bold rounded-xl shadow">+ Buat LKPD Baru</button>
      </div>
      <div class="space-y-2">
        ${lkpdList.map(l => `
          <div class="bg-white p-4 rounded-3xl border flex items-center justify-between">
            <div>
              <span class="px-2 py-0.5 bg-blue-100 text-brand-blue font-bold text-[10px] rounded-full uppercase">${l.tipe_lkpd || 'manual'}</span>
              <h4 class="font-black text-brand-navy mt-1">${l.judul_lkpd}</h4>
              <p class="text-slate-500">${l.instruksi}</p>
            </div>
            <button onclick="deleteLkpd('${l.id_lkpd}')" class="px-3 py-1 bg-red-100 text-red-700 rounded-lg font-bold">Hapus</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderGuruGameView(container) {
    const gamesList = state.cachedData.games || [];
    container.innerHTML = `
    <div class="space-y-4 text-xs">
      <div class="flex items-center justify-between bg-white p-4 rounded-2xl border shadow-xs">
        <span class="font-bold text-slate-700">Total Game Aktif: <b>${gamesList.length}</b></span>
        <button onclick="openGameModal()" class="px-4 py-2 bg-purple-600 text-white font-bold rounded-xl shadow">+ Konfigurasi Game</button>
      </div>
      <div class="space-y-2">
        ${gamesList.map(g => `
          <div class="bg-white p-4 rounded-3xl border flex items-center justify-between">
            <div>
              <span class="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold text-[10px] rounded-full uppercase">${g.tipe_game}</span>
              <h4 class="font-black text-brand-navy mt-1">${g.judul_game}</h4>
              <p class="text-slate-500">${g.instruksi}</p>
            </div>
            <button onclick="deleteGame('${g.id_game}')" class="px-3 py-1 bg-red-100 text-red-700 rounded-lg font-bold">Hapus</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderGuruSoalView(container) {
    const soalList = state.cachedData.soal_evaluasi || [];
    container.innerHTML = `
    <div class="space-y-4 text-xs">
      <div class="flex items-center justify-between bg-white p-4 rounded-2xl border shadow-xs">
        <span class="font-bold text-slate-700">Bank Soal Evaluasi: <b>${soalList.length} Soal</b></span>
        <button onclick="openSoalModal()" class="px-4 py-2 bg-brand-blue text-white font-bold rounded-xl shadow">+ Tambah Soal</button>
      </div>
      <div class="space-y-2">
        ${soalList.map((s, idx) => `
          <div class="bg-white p-4 rounded-3xl border space-y-1">
            <div class="flex items-center justify-between border-b pb-1">
              <span class="font-black text-brand-navy">#${idx + 1} Kunci: ${s.kunci_jawaban}</span>
              <button onclick="deleteSoal('${s.id_soal}')" class="px-2 py-0.5 bg-red-100 text-red-700 rounded font-bold">Hapus</button>
            </div>
            <p class="font-bold text-slate-800">${s.pertanyaan}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderGuruKoreksiView(container) {
    const subs = state.cachedData.submissions || [];
    container.innerHTML = `
    <div class="space-y-4 text-xs">
      <div class="bg-white p-5 rounded-3xl border shadow-sm">
        <h3 class="font-black text-brand-navy text-sm font-heading border-b pb-2">📥 Jawaban Masuk Siswa (${subs.length})</h3>
        <div class="overflow-x-auto mt-3">
          <table class="w-full text-left">
            <thead class="bg-brand-navy text-white font-heading">
              <tr>
                <th class="p-3">Siswa</th>
                <th class="p-3">Tipe Modul</th>
                <th class="p-3">Nilai</th>
                <th class="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${subs.map(s => {
        const scoreDisplay = (s.nilai_esai !== "" && s.nilai_esai !== null && s.nilai_esai !== undefined) ? s.nilai_esai : ((s.skor_otomatis !== "" && s.skor_otomatis !== null && s.skor_otomatis !== undefined) ? s.skor_otomatis : 'Belum');
        return `
                <tr>
                  <td class="p-3 font-bold">${s.nama_siswa} (${s.kelas})</td>
                  <td class="p-3 font-mono uppercase">${s.tipe_sub}</td>
                  <td class="p-3 font-bold text-brand-blue">${scoreDisplay}</td>
                  <td class="p-3 text-center">
                    <button onclick="openKoreksiModal('${s.id_sub}')" class="px-3 py-1 bg-brand-blue text-white font-bold rounded-lg">Periksa</button>
                  </td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderGuruRekapView(container) {
    const subs = state.cachedData.submissions || [];
    container.innerHTML = `
    <div class="space-y-4 text-xs">
      <div class="flex items-center justify-between bg-white p-4 rounded-2xl border shadow-xs">
        <span class="font-bold text-slate-700">Total Submisi Nilai: <b>${subs.length}</b></span>
        <button onclick="exportRekapToCsv()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow flex items-center gap-1.5 transition">
          <span>📊 Ekspor Excel / CSV</span>
        </button>
      </div>
      <div class="bg-white p-5 rounded-3xl border shadow-sm">
        <h3 class="font-black text-brand-navy text-sm font-heading border-b pb-2">🏆 Buku Nilai & Rekapitulasi Siswa</h3>
        <div class="overflow-x-auto mt-3">
          <table class="w-full text-left">
            <thead class="bg-brand-navy text-white font-heading">
              <tr>
                <th class="p-3">Nama Siswa</th>
                <th class="p-3">Kelas</th>
                <th class="p-3 text-center">Tipe Submisi</th>
                <th class="p-3 text-center">Nilai Akhir</th>
                <th class="p-3">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${subs.length === 0 ? `<tr><td colspan="5" class="p-4 text-center text-slate-400">Belum ada data nilai masuk.</td></tr>` :
            subs.map(s => {
                const scoreDisplay = (s.nilai_esai !== "" && s.nilai_esai !== null && s.nilai_esai !== undefined)
                    ? s.nilai_esai
                    : ((s.skor_otomatis !== "" && s.skor_otomatis !== null && s.skor_otomatis !== undefined) ? s.skor_otomatis : 0);
                return `
                <tr>
                  <td class="p-3 font-bold">${s.nama_siswa || '-'}</td>
                  <td class="p-3">${s.kelas || '-'}</td>
                  <td class="p-3 text-center uppercase font-mono">${s.tipe_sub || '-'}</td>
                  <td class="p-3 text-center font-black text-emerald-600">${scoreDisplay}</td>
                  <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'Selesai Dinilai' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">${s.status || 'Belum'}</span></td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function exportRekapToCsv() {
    const subs = state.cachedData.submissions || [];
    if (subs.length === 0) {
        showToast('warning', 'Belum ada data submisi untuk diekspor!');
        return;
    }

    let csvContent = "\uFEFF";
    csvContent += "ID Submisi,Username,Nama Siswa,Kelas,Tipe Modul,Skor Otomatis,Nilai Esai,Nilai Akhir,Status,Waktu Submisi,Catatan Guru\n";

    subs.forEach(s => {
        const finalScore = (s.nilai_esai !== "" && s.nilai_esai !== null && s.nilai_esai !== undefined)
            ? s.nilai_esai
            : ((s.skor_otomatis !== "" && s.skor_otomatis !== null && s.skor_otomatis !== undefined) ? s.skor_otomatis : 0);

        const row = [
            `"${s.id_sub || ''}"`,
            `"${s.username_siswa || ''}"`,
            `"${(s.nama_siswa || '').replace(/"/g, '""')}"`,
            `"${s.kelas || ''}"`,
            `"${String(s.tipe_sub || '').toUpperCase()}"`,
            `"${s.skor_otomatis || 0}"`,
            `"${s.nilai_esai || ''}"`,
            `"${finalScore}"`,
            `"${s.status || ''}"`,
            `"${s.timestamp || ''}"`,
            `"${(s.catatan_guru || '').replace(/"/g, '""')}"`
        ];
        csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Rekap_Nilai_ELKPD_STEAM_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Rekap nilai berhasil diunduh (CSV)!');
}

/* ==========================================================
   9. CANVAS DRAWING LOGIC (LKPD + STANDALONE STEAM LAB)
   ========================================================== */
// Canvas Khas LKPD
let canvasCtx = null;
let isDrawing = false;
let currentPenColor = '#0B2545';
let canvasUndoStack = [];

function initCanvas() {
    const canvas = document.getElementById('steam-canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 600;
    canvas.height = 240;

    canvasCtx = canvas.getContext('2d');
    canvasCtx.fillStyle = '#FFFFFF';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    canvasCtx.lineWidth = 3;
    canvasCtx.lineCap = 'round';
    canvasCtx.lineJoin = 'round';
    canvasCtx.strokeStyle = currentPenColor;

    canvasUndoStack = [];
    saveCanvasState();

    canvas.onmousedown = (e) => startDrawing(e, canvas, canvasCtx);
    canvas.onmousemove = (e) => draw(e, canvas, canvasCtx);
    canvas.onmouseup = () => stopDrawing();
    canvas.onmouseleave = () => stopDrawing();

    canvas.ontouchstart = (e) => { e.preventDefault(); startDrawing(e.touches[0], canvas, canvasCtx); };
    canvas.ontouchmove = (e) => { e.preventDefault(); draw(e.touches[0], canvas, canvasCtx); };
    canvas.ontouchend = (e) => { e.preventDefault(); stopDrawing(); };
}

function startDrawing(e, canvas, ctx) {
    isDrawing = true;
    ctx.beginPath();
    const c = getCoords(e, canvas);
    ctx.moveTo(c.x, c.y);
}

function draw(e, canvas, ctx) {
    if (!isDrawing) return;
    const c = getCoords(e, canvas);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        saveCanvasState();
        saveStandaloneCanvasState();
    }
}

function saveCanvasState() {
    const canvas = document.getElementById('steam-canvas');
    if (canvas && canvasCtx && canvasUndoStack.length < 15) {
        canvasUndoStack.push(canvasCtx.getImageData(0, 0, canvas.width, canvas.height));
    }
}

function undoCanvas() {
    const canvas = document.getElementById('steam-canvas');
    if (canvas && canvasCtx && canvasUndoStack.length > 1) {
        canvasUndoStack.pop();
        const prevState = canvasUndoStack[canvasUndoStack.length - 1];
        canvasCtx.putImageData(prevState, 0, 0);
    }
}

function setCanvasColor(color) { currentPenColor = color; if (canvasCtx) canvasCtx.strokeStyle = color; }
function clearCanvas() {
    const canvas = document.getElementById('steam-canvas');
    if (canvas && canvasCtx) {
        canvasCtx.fillStyle = '#FFFFFF';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        saveCanvasState();
    }
}

// Standalone STEAM Lab Canvas Engine
let stCanvasCtx = null;
let stPenColor = '#0B2545';
let stLineWidth = 3;
let stUndoStack = [];

function initStandaloneSteamCanvas() {
    const canvas = document.getElementById('ruang-steam-canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 700;
    canvas.height = 380;

    stCanvasCtx = canvas.getContext('2d');
    stCanvasCtx.fillStyle = '#FFFFFF';
    stCanvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    stCanvasCtx.lineWidth = stLineWidth;
    stCanvasCtx.lineCap = 'round';
    stCanvasCtx.lineJoin = 'round';
    stCanvasCtx.strokeStyle = stPenColor;

    stUndoStack = [];
    saveStandaloneCanvasState();

    canvas.onmousedown = (e) => startDrawing(e, canvas, stCanvasCtx);
    canvas.onmousemove = (e) => draw(e, canvas, stCanvasCtx);
    canvas.onmouseup = () => stopDrawing();
    canvas.onmouseleave = () => stopDrawing();

    canvas.ontouchstart = (e) => { e.preventDefault(); startDrawing(e.touches[0], canvas, stCanvasCtx); };
    canvas.ontouchmove = (e) => { e.preventDefault(); draw(e.touches[0], canvas, stCanvasCtx); };
    canvas.ontouchend = (e) => { e.preventDefault(); stopDrawing(); };
}

function saveStandaloneCanvasState() {
    const canvas = document.getElementById('ruang-steam-canvas');
    if (canvas && stCanvasCtx && stUndoStack.length < 20) {
        stUndoStack.push(stCanvasCtx.getImageData(0, 0, canvas.width, canvas.height));
    }
}

function undoStandaloneCanvas() {
    const canvas = document.getElementById('ruang-steam-canvas');
    if (canvas && stCanvasCtx && stUndoStack.length > 1) {
        stUndoStack.pop();
        const prevState = stUndoStack[stUndoStack.length - 1];
        stCanvasCtx.putImageData(prevState, 0, 0);
    }
}

function setStandaloneCanvasColor(color) {
    stPenColor = color;
    if (stCanvasCtx) stCanvasCtx.strokeStyle = color;
}

function setStandaloneCanvasSize(size) {
    stLineWidth = size;
    if (stCanvasCtx) stCanvasCtx.lineWidth = size;
}

function clearStandaloneCanvas() {
    const canvas = document.getElementById('ruang-steam-canvas');
    if (canvas && stCanvasCtx) {
        stCanvasCtx.fillStyle = '#FFFFFF';
        stCanvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        saveStandaloneCanvasState();
    }
}

function downloadSteamCanvasImage() {
    const canvas = document.getElementById('ruang-steam-canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `Sketsa_Eksperimen_STEAM_${new Date().getTime()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('success', 'Sketsa berhasil diunduh ke perangkat!');
}

function getCoords(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
    };
}

/* ==========================================================
   10. SUBMISSION ACTIONS SISWA & AUTO-SAVE DRAFT
   ========================================================== */
function saveLkpdDraft(ptmId, questionCount) {
    const username = state.currentUser ? state.currentUser.username : 'guest';
    const draftKey = `${CACHE_KEY}_DRAFT_${ptmId}_${username}`;
    const answers = [];
    for (let i = 0; i < questionCount; i++) {
        answers.push(document.getElementById(`lkpd-ans-${i}`)?.value || '');
    }
    localStorage.setItem(draftKey, JSON.stringify({ answers, timestamp: new Date().toISOString() }));
}

function loadLkpdDraft(ptmId, questionCount) {
    const username = state.currentUser ? state.currentUser.username : 'guest';
    const draftKey = `${CACHE_KEY}_DRAFT_${ptmId}_${username}`;
    try {
        const saved = localStorage.getItem(draftKey);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && Array.isArray(parsed.answers)) {
                parsed.answers.forEach((ans, idx) => {
                    const elem = document.getElementById(`lkpd-ans-${idx}`);
                    if (elem) elem.value = ans;
                });
                showToast('info', 'Draft pengerjaan berhasil dipulihkan!');
            }
        }
    } catch (e) {
        console.error('Gagal memulihkan draft:', e);
    }
}

function clearLkpdDraft(ptmId) {
    const username = state.currentUser ? state.currentUser.username : 'guest';
    const draftKey = `${CACHE_KEY}_DRAFT_${ptmId}_${username}`;
    localStorage.removeItem(draftKey);
}

async function submitLkpdSiswa(ptmId, questionCount) {
    const user = state.currentUser;
    let answers = [];
    for (let i = 0; i < questionCount; i++) {
        answers.push(document.getElementById(`lkpd-ans-${i}`)?.value || '');
    }

    const canvas = document.getElementById('steam-canvas');
    const canvasBase64 = canvas ? canvas.toDataURL('image/png') : '';

    const btn = document.getElementById('btn-submit-lkpd-siswa');
    setButtonLoading(btn, true, '🚀 Mengirim LKPD...', '🚀 Kirim Jawaban LKPD');

    const res = await apiPost({
        action: 'submit_lkpd',
        id_pertemuan: ptmId,
        username_siswa: user.username,
        nama_siswa: user.name,
        kelas: user.kelas,
        jawaban_json: answers,
        canvas_image_base64: canvasBase64
    });

    setButtonLoading(btn, false, '', '🚀 Kirim Jawaban LKPD');
    if (res.success) {
        clearLkpdDraft(ptmId);
        await fetchAllInitialData(true);
        showToast('success', 'Jawaban LKPD Berhasil Terkirim!');
    } else {
        Swal.fire({ icon: 'error', title: 'Gagal Mengirim', text: res.message });
    }
}

async function submitGameSiswa(ptmId, tipe) {
    const items = state.activeGameItems || [];
    let correctCount = 0;

    items.forEach((item, idx) => {
        const userAns = state.gameAnswers[idx];
        if (tipe === 'matching') {
            if (String(userAns || '').trim().toLowerCase() === String(item.kunci || '').trim().toLowerCase()) correctCount++;
        } else if (tipe === 'drag_drop') {
            if (userAns === item.kategori_kunci) correctCount++;
        } else {
            if (userAns === item.kunci) correctCount++;
        }
    });

    const score = Math.round((correctCount / Math.max(items.length, 1)) * 100);
    const btn = document.getElementById('btn-submit-game-siswa');
    setButtonLoading(btn, true, '🎮 Menyimpan Skor...', '🎮 Periksa & Simpan Skor Game');

    const res = await apiPost({
        action: 'submit_game',
        id_pertemuan: ptmId,
        username_siswa: state.currentUser.username,
        nama_siswa: state.currentUser.name,
        kelas: state.currentUser.kelas,
        jawaban_json: state.gameAnswers,
        skor_game: score
    });

    setButtonLoading(btn, false, '', '🎮 Periksa & Simpan Skor Game');
    if (res.success) {
        await fetchAllInitialData(true);
        Swal.fire({ icon: 'success', title: 'Permainan Selesai!', html: `Skor Kamu: <b class="text-2xl text-purple-600 block mt-1">${score} / 100</b>` });
    } else {
        Swal.fire({ icon: 'error', title: 'Gagal Menyimpan Skor', text: res.message });
    }
}

async function submitEvaluasiSiswa(ptmId, idEvaluasi) {
    const soalList = (state.cachedData.soal_evaluasi || []).filter(s => s.id_evaluasi === idEvaluasi);
    let benar = 0;
    soalList.forEach(s => {
        if (state.evaluasiAnswers[s.id_soal] === s.kunci_jawaban) benar++;
    });

    const score = Math.round((benar / Math.max(soalList.length, 1)) * 100);
    const btn = document.getElementById('btn-submit-eval-siswa');
    setButtonLoading(btn, true, '🚀 Mengirim Evaluasi...', '🚀 Kirim Jawaban Evaluasi & Hitung Skor');

    const res = await apiPost({
        action: 'submit_evaluasi',
        id_pertemuan: ptmId,
        username_siswa: state.currentUser.username,
        nama_siswa: state.currentUser.name,
        kelas: state.currentUser.kelas,
        jawaban_json: state.evaluasiAnswers,
        skor_pg: score
    });

    setButtonLoading(btn, false, '', '🚀 Kirim Jawaban Evaluasi & Hitung Skor');
    if (res.success) {
        await fetchAllInitialData(true);
        Swal.fire({ icon: 'success', title: 'Evaluasi Selesai!', html: `Skor Kamu: <b class="text-2xl text-brand-blue block mt-1">${score} / 100</b>` });
    } else {
        Swal.fire({ icon: 'error', title: 'Gagal Mengirim Evaluasi', text: res.message });
    }
}

/* ==========================================================
   11. CMS ADMIN MODALS & HANDLERS
   ========================================================== */
function openUserModal() {
    populateKelasSelects();

    const idElem = document.getElementById('user-form-id');
    const namaElem = document.getElementById('user-form-nama');
    const usernameElem = document.getElementById('user-form-username');
    const passElem = document.getElementById('user-form-password');
    const roleElem = document.getElementById('user-form-role');
    const kelasElem = document.getElementById('user-form-kelas');

    if (idElem) idElem.value = '';
    if (namaElem) namaElem.value = '';
    if (usernameElem) usernameElem.value = '';
    if (passElem) passElem.value = '';
    if (roleElem) roleElem.value = 'siswa';
    if (kelasElem) kelasElem.value = '-';

    document.getElementById('user-modal').classList.remove('hidden');
    document.getElementById('user-modal').classList.add('flex');
}

function closeUserModal() {
    document.getElementById('user-modal').classList.add('hidden');
    document.getElementById('user-modal').classList.remove('flex');
}

async function handleUserSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-user');
    setButtonLoading(btn, true, '💾 Menyimpan...', '💾 Simpan Pengguna');

    const res = await apiPost({
        action: 'add_user',
        user_id: document.getElementById('user-form-id').value,
        nama_lengkap: document.getElementById('user-form-nama').value,
        username: document.getElementById('user-form-username').value,
        password: document.getElementById('user-form-password').value,
        role: document.getElementById('user-form-role').value,
        kelas: document.getElementById('user-form-kelas').value
    });

    setButtonLoading(btn, false, '', '💾 Simpan Pengguna');
    if (res.success) {
        closeUserModal();
        showToast('success', res.message);
        await fetchAllInitialData(true);
        switchView('admin-users');
    } else {
        Swal.fire({ icon: 'error', title: 'Gagal Menyimpan', text: res.message });
    }
}

function openKelasModal() {
    const idElem = document.getElementById('kelas-form-id');
    const namaElem = document.getElementById('kelas-form-nama');
    const tingkatElem = document.getElementById('kelas-form-tingkat');
    const ketElem = document.getElementById('kelas-form-keterangan');

    if (idElem) idElem.value = '';
    if (namaElem) namaElem.value = '';
    if (tingkatElem) tingkatElem.value = '';
    if (ketElem) ketElem.value = '';

    document.getElementById('kelas-modal').classList.remove('hidden');
    document.getElementById('kelas-modal').classList.add('flex');
}

function closeKelasModal() {
    document.getElementById('kelas-modal').classList.add('hidden');
    document.getElementById('kelas-modal').classList.remove('flex');
}

async function handleKelasSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-kelas');
    setButtonLoading(btn, true, '💾 Menyimpan...', '💾 Simpan Kelas');

    const res = await apiPost({
        action: 'save_kelas',
        id_kelas: document.getElementById('kelas-form-id').value,
        nama_kelas: document.getElementById('kelas-form-nama').value,
        tingkat: document.getElementById('kelas-form-tingkat').value,
        keterangan: document.getElementById('kelas-form-keterangan').value
    });

    setButtonLoading(btn, false, '', '💾 Simpan Kelas');
    if (res.success) {
        closeKelasModal();
        showToast('success', res.message);
        await fetchAllInitialData(true);
        switchView('admin-classes');
    } else {
        Swal.fire({ icon: 'error', title: 'Gagal Menyimpan', text: res.message });
    }
}

function deleteUser(id) {
    showConfirm('Hapus Pengguna?', 'Akun pengguna ini akan dihapus permanen!', async () => {
        showLoading('Menghapus data...');
        await apiPost({ action: 'delete_user', user_id: id });
        closeLoading();
        showToast('success', 'Pengguna berhasil dihapus');
        await fetchAllInitialData(true);
        switchView('admin-users');
    });
}

function deleteKelas(id) {
    showConfirm('Hapus Data Kelas?', 'Data kelas ini akan dihapus!', async () => {
        showLoading('Menghapus kelas...');
        await apiPost({ action: 'delete_kelas', id_kelas: id });
        closeLoading();
        showToast('success', 'Kelas berhasil dihapus');
        await fetchAllInitialData(true);
        switchView('admin-classes');
    });
}

/* ==========================================================
   12. CMS GURU HANDLERS & MODALS
   ========================================================== */
function populatePertemuanSelects() {
    const ptmList = state.cachedData.pertemuan || [];
    const opts = ptmList.map(p => `<option value="${p.id_pertemuan}">Pertemuan ${p.nomor_pertemuan}: ${p.judul_pertemuan}</option>`).join('');

    const mSel = document.getElementById('materi-form-pertemuan'); if (mSel) mSel.innerHTML = opts;
    const lSel = document.getElementById('lkpd-form-pertemuan'); if (lSel) lSel.innerHTML = opts;
    const gSel = document.getElementById('game-form-pertemuan'); if (gSel) gSel.innerHTML = opts;
    const sSel = document.getElementById('soal-form-pertemuan'); if (sSel) sSel.innerHTML = opts;
}

function openPertemuanModal() {
    populateKelasSelects();

    document.getElementById('pertemuan-form-id').value = '';
    document.getElementById('pertemuan-form-nomor').value = '1';
    document.getElementById('pertemuan-form-judul').value = '';
    document.getElementById('pertemuan-form-deskripsi').value = '';
    document.getElementById('pertemuan-form-status').value = 'Publish';

    document.getElementById('pertemuan-modal').classList.remove('hidden');
    document.getElementById('pertemuan-modal').classList.add('flex');
}
function closePertemuanModal() { document.getElementById('pertemuan-modal').classList.add('hidden'); document.getElementById('pertemuan-modal').classList.remove('flex'); }

async function handlePertemuanSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-pertemuan');
    setButtonLoading(btn, true, '💾 Menyimpan...', '💾 Simpan Pertemuan');

    const res = await apiPost({
        action: 'save_pertemuan',
        id_pertemuan: document.getElementById('pertemuan-form-id').value,
        nomor_pertemuan: document.getElementById('pertemuan-form-nomor').value,
        judul_pertemuan: document.getElementById('pertemuan-form-judul').value,
        deskripsi: document.getElementById('pertemuan-form-deskripsi').value,
        id_kelas: document.getElementById('pertemuan-form-kelas').value,
        status: document.getElementById('pertemuan-form-status').value
    });

    setButtonLoading(btn, false, '', '💾 Simpan Pertemuan');
    if (res.success) {
        closePertemuanModal();
        showToast('success', res.message);
        await fetchAllInitialData(true);
        switchView('guru-pertemuan');
    } else {
        Swal.fire({ icon: 'error', title: 'Gagal Menyimpan', text: res.message });
    }
}

function openMateriModal() {
    populatePertemuanSelects();

    document.getElementById('materi-form-id').value = '';
    document.getElementById('materi-form-pdf-id').value = '';
    document.getElementById('materi-form-judul').value = '';
    document.getElementById('materi-form-teks').value = '';
    document.getElementById('materi-form-pdf-url').value = '';
    const filePdf = document.getElementById('materi-form-file-pdf');
    if (filePdf) filePdf.value = '';

    document.getElementById('materi-modal').classList.remove('hidden');
    document.getElementById('materi-modal').classList.add('flex');
}
function closeMateriModal() { document.getElementById('materi-modal').classList.add('hidden'); document.getElementById('materi-modal').classList.remove('flex'); }

function toggleMateriFormTipe() {
    const tipe = document.getElementById('materi-form-tipe').value;
    const pdfCon = document.getElementById('container-materi-pdf');
    if (tipe === 'pdf_document') pdfCon.classList.remove('hidden');
    else pdfCon.classList.add('hidden');
}

async function uploadPdfToDrive(targetModule = 'materi') {
    const isLkpd = targetModule === 'lkpd';
    const fileInput = document.getElementById(isLkpd ? 'lkpd-form-file-pdf' : 'materi-form-file-pdf');
    const btn = document.getElementById(isLkpd ? 'btn-upload-pdf-lkpd' : 'btn-upload-pdf');
    if (!fileInput.files || fileInput.files.length === 0) {
        showToast('warning', 'Pilih file PDF terlebih dahulu!');
        return;
    }

    setButtonLoading(btn, true, '📤 Memproses...', '📤 Unggah PDF ke Drive');
    const reader = new FileReader();
    reader.onload = async function (e) {
        const res = await apiPost({ action: 'upload_pdf', base64Data: e.target.result, fileName: fileInput.files[0].name });
        setButtonLoading(btn, false, '', '📤 Unggah PDF ke Drive');
        if (res.success) {
            showToast('success', 'PDF Berhasil Diunggah!');
            if (isLkpd) {
                document.getElementById('lkpd-form-pdf-url').value = res.url;
                document.getElementById('lkpd-form-pdf-id').value = res.fileId;
            } else {
                document.getElementById('materi-form-pdf-url').value = res.url;
                document.getElementById('materi-form-pdf-id').value = res.fileId;
            }
        } else {
            Swal.fire({ icon: 'error', title: 'Gagal Unggah PDF', text: res.message });
        }
    };
    reader.readAsDataURL(fileInput.files[0]);
}

async function handleMateriSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-materi');
    setButtonLoading(btn, true, '💾 Menyimpan...', '💾 Simpan Materi');

    const res = await apiPost({
        action: 'save_materi',
        id_materi: document.getElementById('materi-form-id').value,
        id_pertemuan: document.getElementById('materi-form-pertemuan').value,
        judul_materi: document.getElementById('materi-form-judul').value,
        tipe_media: document.getElementById('materi-form-tipe').value,
        isi_teks: document.getElementById('materi-form-teks').value,
        file_pdf_url: document.getElementById('materi-form-pdf-url').value,
        file_drive_id: document.getElementById('materi-form-pdf-id').value
    });

    setButtonLoading(btn, false, '', '💾 Simpan Materi');
    if (res.success) {
        closeMateriModal();
        showToast('success', res.message);
        await fetchAllInitialData(true);
        switchView('guru-materi');
    } else {
        Swal.fire({ icon: 'error', title: 'Gagal Menyimpan Materi', text: res.message });
    }
}

function openLkpdModal() {
    populatePertemuanSelects();

    document.getElementById('lkpd-form-id').value = '';
    document.getElementById('lkpd-form-pdf-id').value = '';
    document.getElementById('lkpd-form-judul').value = '';
    document.getElementById('lkpd-form-instruksi').value = '';
    document.getElementById('lkpd-form-pdf-url').value = '';
    document.getElementById('lkpd-form-gambar-url').value = '';
    document.getElementById('lkpd-form-soal-text').value = '';
    document.getElementById('lkpd-form-kanvas').checked = false;
    const filePdf = document.getElementById('lkpd-form-file-pdf');
    if (filePdf) filePdf.value = '';

    document.getElementById('lkpd-modal').classList.remove('hidden');
    document.getElementById('lkpd-modal').classList.add('flex');
}
function closeLkpdModal() { document.getElementById('lkpd-modal').classList.add('hidden'); document.getElementById('lkpd-modal').classList.remove('flex'); }

function toggleLkpdFormTipe() {
    const tipe = document.getElementById('lkpd-form-tipe').value;
    const pdfCon = document.getElementById('container-lkpd-pdf');
    const manualCon = document.getElementById('container-lkpd-manual');
    if (tipe === 'pdf') {
        pdfCon.classList.remove('hidden');
        manualCon.classList.add('hidden');
    } else {
        pdfCon.classList.add('hidden');
        manualCon.classList.remove('hidden');
    }
}

async function handleLkpdSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-lkpd');
    setButtonLoading(btn, true, '💾 Menyimpan...', '💾 Simpan LKPD');

    const soalArr = document.getElementById('lkpd-form-soal-text').value.split('\n').filter(s => s.trim() !== '');

    const res = await apiPost({
        action: 'save_lkpd',
        id_lkpd: document.getElementById('lkpd-form-id').value,
        id_pertemuan: document.getElementById('lkpd-form-pertemuan').value,
        judul_lkpd: document.getElementById('lkpd-form-judul').value,
        tipe_lkpd: document.getElementById('lkpd-form-tipe').value,
        instruksi: document.getElementById('lkpd-form-instruksi').value,
        file_pdf_url: document.getElementById('lkpd-form-pdf-url').value,
        file_drive_id: document.getElementById('lkpd-form-pdf-id').value,
        gambar_url: document.getElementById('lkpd-form-gambar-url').value,
        soal_json: soalArr,
        fitur_kanvas: document.getElementById('lkpd-form-kanvas').checked
    });

    setButtonLoading(btn, false, '', '💾 Simpan LKPD');
    if (res.success) {
        closeLkpdModal();
        showToast('success', res.message);
        await fetchAllInitialData(true);
        switchView('guru-lkpd');
    } else {
        Swal.fire({ icon: 'error', title: 'Gagal Menyimpan LKPD', text: res.message });
    }
}

function openGameModal() {
    populatePertemuanSelects();

    document.getElementById('game-form-id').value = '';
    document.getElementById('game-form-judul').value = '';
    document.getElementById('game-form-instruksi').value = '';

    renderGameConfigInputs();
    document.getElementById('game-modal').classList.remove('hidden');
    document.getElementById('game-modal').classList.add('flex');
}
function closeGameModal() { document.getElementById('game-modal').classList.add('hidden'); document.getElementById('game-modal').classList.remove('flex'); }

/* ==========================================================
   GAME INTERAKTIF ENHANCEMENT (TAHAP 1: SEQUENCER & HOTSPOT)
   ========================================================== */

// 1. UPDATE BUILDER CMS GURU (renderGameConfigInputs)
function renderGameConfigInputs() {
    const tipe = document.getElementById('game-form-tipe').value;
    const container = document.getElementById('game-dynamic-builder-container');
    container.innerHTML = '';

    if (tipe === 'matching') {
        container.innerHTML = `<div class="text-[10px] text-purple-700 font-bold mb-1">Isikan Pertanyaan / Teks dan Pasangan Kunci Jawaban:</div>`;
    } else if (tipe === 'drag_drop') {
        container.innerHTML = `
          <div class="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label class="block font-bold text-slate-700">Nama Kategori A</label>
              <input type="text" id="gm-cat-name-a" value="Energi Potensial" class="w-full p-2 border rounded-xl font-bold" />
            </div>
            <div>
              <label class="block font-bold text-slate-700">Nama Kategori B</label>
              <input type="text" id="gm-cat-name-b" value="Energi Kinetik" class="w-full p-2 border rounded-xl font-bold" />
            </div>
          </div>
        `;
    } else if (tipe === 'sequencer') {
        container.innerHTML = `<div class="text-[10px] text-purple-700 font-bold mb-1">Isikan langkah-langkah proses secara berurutan DARI AWAL HINGGA AKHIR (Sistem akan mengacaknya secara otomatis untuk siswa):</div>`;
    } else if (tipe === 'hotspot') {
        container.innerHTML = `
          <div class="space-y-2 mb-3">
            <div>
              <label class="block font-bold text-slate-700">URL Gambar Diagram IPA / STEAM</label>
              <input type="url" id="gm-hotspot-img-url" placeholder="https://example.com/diagram-sel.png" class="w-full p-2 border rounded-xl font-mono text-[11px]" />
            </div>
            <div class="text-[10px] text-purple-700 font-bold">Tambahkan Nama Bagian / Pin Label:</div>
          </div>
        `;
    } else {
        container.innerHTML = `<div class="text-[10px] text-purple-700 font-bold mb-1">Isikan Pertanyaan Singkat beserta Kunci Jawabannya:</div>`;
    }

    addGameItemRow();
}

// 2. UPDATE TAMBAH BARIS ITEM CMS (addGameItemRow)
function addGameItemRow() {
    const tipe = document.getElementById('game-form-tipe').value;
    const container = document.getElementById('game-dynamic-builder-container');

    const row = document.createElement('div');
    row.className = 'gm-item-row p-2.5 bg-white border rounded-2xl space-y-1.5 shadow-2xs relative';

    if (tipe === 'matching') {
        row.innerHTML = `
          <div class="grid grid-cols-2 gap-2">
            <input type="text" class="gm-input-soal w-full p-2 rounded-xl border text-[11px]" placeholder="Soal / Teks (misal: Air Terjun)" />
            <input type="text" class="gm-input-kunci w-full p-2 rounded-xl border text-[11px]" placeholder="Pasangan Kunci" />
          </div>
        `;
    } else if (tipe === 'drag_drop') {
        row.innerHTML = `
          <div class="grid grid-cols-3 gap-2">
            <input type="text" class="gm-input-soal col-span-2 w-full p-2 rounded-xl border text-[11px]" placeholder="Objek / Teks" />
            <select class="gm-input-cat-kunci w-full p-2 rounded-xl border font-bold text-[11px] text-purple-700">
              <option value="A">Kategori A</option>
              <option value="B">Kategori B</option>
            </select>
          </div>
        `;
    } else if (tipe === 'sequencer') {
        const currentCount = container.querySelectorAll('.gm-item-row').length + 1;
        row.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 font-black text-[10px] flex items-center justify-center shrink-0">${currentCount}</span>
            <input type="text" class="gm-input-soal w-full p-2 rounded-xl border text-[11px]" placeholder="Langkah urutan ke-${currentCount}..." />
          </div>
        `;
    } else if (tipe === 'hotspot') {
        const pinNum = container.querySelectorAll('.gm-item-row').length + 1;
        row.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-lg bg-brand-navy text-white font-black text-[10px] flex items-center justify-center shrink-0">Pin ${pinNum}</span>
            <input type="text" class="gm-input-soal w-full p-2 rounded-xl border text-[11px]" placeholder="Nama bagian / label pin ${pinNum}..." />
          </div>
        `;
    } else {
        row.innerHTML = `
          <input type="text" class="gm-input-soal w-full p-2 rounded-xl border text-[11px]" placeholder="Pertanyaan..." />
          <div class="grid grid-cols-3 gap-1">
            <input type="text" class="gm-input-opsi-a w-full p-1.5 rounded-lg border text-[10px]" placeholder="Opsi A" />
            <input type="text" class="gm-input-opsi-b w-full p-1.5 rounded-lg border text-[10px]" placeholder="Opsi B" />
            <select class="gm-input-kunci w-full p-1.5 rounded-lg border font-bold text-[10px] text-purple-700">
              <option value="A">Kunci A</option>
              <option value="B">Kunci B</option>
            </select>
          </div>
        `;
    }

    container.appendChild(row);
}

// 3. RENDER INTERAKTIF SISWA UNTUK GAME 4 & 5 (renderGameInteractiveBody)
// Tambahkan cabang kondisi berikut ke dalam fungsi renderGameInteractiveBody:

/* --- GAME 4: SEQUENCER --- */
if (tipe === 'sequencer') {
    // Acak urutan item untuk pertama kali
    if (!state.sequencerItems) {
        state.sequencerItems = [...items].map((it, origIdx) => ({ text: it.soal, correctOrder: origIdx }));
        state.sequencerItems.sort(() => Math.random() - 0.5);
    }

    return `
      <div class="space-y-3">
        <div class="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-[11px] text-purple-900 font-medium">
          💡 Gunakan tombol panah <b>▲ Naik</b> dan <b>▼ Turun</b> untuk menyusun tahapan di bawah ini agar berurutan secara benar dari atas ke bawah!
        </div>
        <div id="sequencer-list-container" class="space-y-2">
          ${state.sequencerItems.map((item, idx) => `
            <div class="p-3 bg-white rounded-2xl border flex items-center justify-between gap-3 shadow-xs">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center">${idx + 1}</span>
                <span class="font-bold text-slate-800 text-xs">${item.text}</span>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button onclick="moveSequencerItem(${idx}, -1, '${ptmId}')" ${idx === 0 ? 'disabled class="px-2 py-1 bg-slate-100 text-slate-400 rounded-lg text-xs font-bold"' : 'class="px-2 py-1 bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-lg text-xs font-bold"'}>▲</button>
                <button onclick="moveSequencerItem(${idx}, 1, '${ptmId}')" ${idx === state.sequencerItems.length - 1 ? 'disabled class="px-2 py-1 bg-slate-100 text-slate-400 rounded-lg text-xs font-bold"' : 'class="px-2 py-1 bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-lg text-xs font-bold"'}>▼</button>
              </div>
            </div>
          `).join('')}
        </div>
        <button id="btn-submit-game-siswa" onclick="requireStudentAuth(() => submitGameSiswa('${ptmId}', 'sequencer'))" class="w-full py-3.5 bg-purple-600 text-white font-black rounded-2xl shadow hover:bg-purple-700 transition">
          🎮 Periksa & Simpan Urutan
        </button>
      </div>
    `;
}

/* --- GAME 5: HOTSPOT PINNING --- */
if (tipe === 'hotspot') {
    const imgUrl = items[0]?.img_url || '';
    const allLabels = items.map(it => it.soal).sort(() => Math.random() - 0.5);

    return `
      <div class="space-y-4">
        ${imgUrl ? `
          <div class="bg-white p-3 rounded-3xl border text-center">
            <img src="${imgUrl}" alt="Diagram STEAM" class="max-h-80 mx-auto rounded-2xl object-contain border" />
          </div>
        ` : ''}

        <div class="space-y-2">
          ${items.map((item, idx) => `
            <div class="bg-white p-3 rounded-2xl border flex items-center justify-between gap-3">
              <span class="font-bold text-slate-800 text-xs flex items-center gap-2">
                <span class="w-6 h-6 rounded-lg bg-brand-navy text-white font-black text-xs flex items-center justify-center">Pin ${idx + 1}</span>
                <span>Tentukan Label Pin #${idx + 1}:</span>
              </span>
              <select id="hotspot-sel-${idx}" onchange="state.gameAnswers[${idx}] = this.value" class="p-2 rounded-xl border font-bold text-xs text-brand-blue bg-slate-50">
                <option value="">-- Pilih Label --</option>
                ${allLabels.map(lbl => `<option value="${lbl}">${lbl}</option>`).join('')}
              </select>
            </div>
          `).join('')}
        </div>

        <button id="btn-submit-game-siswa" onclick="requireStudentAuth(() => submitGameSiswa('${ptmId}', 'hotspot'))" class="w-full py-3.5 bg-purple-600 text-white font-black rounded-2xl shadow hover:bg-purple-700 transition">
          🎮 Periksa & Simpan Label Pin
        </button>
      </div>
    `;
}

// 4. FUNGSI PENUKAR URUTAN GAME SEQUENCER
function moveSequencerItem(index, direction, ptmId) {
    if (!state.sequencerItems) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= state.sequencerItems.length) return;

    const temp = state.sequencerItems[index];
    state.sequencerItems[index] = state.sequencerItems[targetIndex];
    state.sequencerItems[targetIndex] = temp;

    // Re-render tampilan viewport game
    const viewport = document.getElementById('content-viewport');
    viewport.innerHTML = renderGameView(ptmId);
}

// 5. PENYESUAIAN PENILAIAN OTOMATIS (submitGameSiswa)
// Tambahkan cabang penilaian berikut pada loop submitGameSiswa:
if (tipe === 'sequencer') {
    state.sequencerItems.forEach((it, currentIdx) => {
        if (it.correctOrder === currentIdx) correctCount++;
    });
} else if (tipe === 'hotspot') {
    items.forEach((item, idx) => {
        if (state.gameAnswers[idx] === item.soal) correctCount++;
    });
}

async function handleGameSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-game');
    setButtonLoading(btn, true, '💾 Menyimpan...', '💾 Simpan Game');

    const tipe = document.getElementById('game-form-tipe').value;
    const rows = document.querySelectorAll('.gm-item-row');
    let itemsList = [];

    rows.forEach(r => {
        const soal = r.querySelector('.gm-input-soal')?.value || '';
        if (!soal) return;

        if (tipe === 'matching') {
            const kunci = r.querySelector('.gm-input-kunci')?.value || '';
            itemsList.push({ soal, kunci });
        } else if (tipe === 'drag_drop') {
            const catA = document.getElementById('gm-cat-name-a')?.value || 'Kategori A';
            const catB = document.getElementById('gm-cat-name-b')?.value || 'Kategori B';
            const catKunci = r.querySelector('.gm-input-cat-kunci')?.value || 'A';
            itemsList.push({ soal, kategori_a: catA, kategori_b: catB, kategori_kunci: catKunci });
        } else {
            const opsiA = r.querySelector('.gm-input-opsi-a')?.value || '';
            const opsiB = r.querySelector('.gm-input-opsi-b')?.value || '';
            const kunci = r.querySelector('.gm-input-kunci')?.value || 'A';
            itemsList.push({ soal, opsi_a: opsiA, opsi_b: opsiB, kunci });
        }
    });

    const res = await apiPost({
        action: 'save_game',
        id_game: document.getElementById('game-form-id').value,
        id_pertemuan: document.getElementById('game-form-pertemuan').value,
        judul_game: document.getElementById('game-form-judul').value,
        tipe_game: tipe,
        instruksi: document.getElementById('game-form-instruksi').value,
        konfigurasi_json: { items: itemsList }
    });

    setButtonLoading(btn, false, '', '💾 Simpan Game');
    if (res.success) {
        closeGameModal();
        showToast('success', res.message);
        await fetchAllInitialData(true);
        switchView('guru-game');
    } else {
        Swal.fire({ icon: 'error', title: 'Gagal Menyimpan Game', text: res.message });
    }
}

function openSoalModal() {
    populatePertemuanSelects();

    document.getElementById('soal-form-id').value = '';
    document.getElementById('soal-form-pertanyaan').value = '';
    document.getElementById('soal-form-opsi-a').value = '';
    document.getElementById('soal-form-opsi-b').value = '';
    document.getElementById('soal-form-opsi-c').value = '';
    document.getElementById('soal-form-opsi-d').value = '';
    document.getElementById('soal-form-kunci').value = 'A';

    document.getElementById('soal-modal').classList.remove('hidden');
    document.getElementById('soal-modal').classList.add('flex');
}
function closeSoalModal() { document.getElementById('soal-modal').classList.add('hidden'); document.getElementById('soal-modal').classList.remove('flex'); }

async function handleSoalSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-soal');
    setButtonLoading(btn, true, '💾 Menyimpan...', '💾 Simpan Soal');

    const ptmId = document.getElementById('soal-form-pertemuan').value;
    let evalObj = (state.cachedData.evaluasi || []).find(ev => ev.id_pertemuan === ptmId);
    let evalId = evalObj ? evalObj.id_evaluasi : '';

    if (!evalId) {
        const newEvalRes = await apiPost({ action: 'save_evaluasi', id_pertemuan: ptmId, judul_evaluasi: 'Evaluasi Pembelajaran' });
        evalId = newEvalRes.id_evaluasi || ('EVL_' + new Date().getTime());
    }

    const res = await apiPost({
        action: 'save_soal_evaluasi',
        id_soal: document.getElementById('soal-form-id').value,
        id_evaluasi: evalId,
        pertanyaan: document.getElementById('soal-form-pertanyaan').value,
        opsi_a: document.getElementById('soal-form-opsi-a').value,
        opsi_b: document.getElementById('soal-form-opsi-b').value,
        opsi_c: document.getElementById('soal-form-opsi-c').value,
        opsi_d: document.getElementById('soal-form-opsi-d').value,
        kunci_jawaban: document.getElementById('soal-form-kunci').value
    });

    setButtonLoading(btn, false, '', '💾 Simpan Soal');
    if (res.success) {
        closeSoalModal();
        showToast('success', res.message);
        await fetchAllInitialData(true);
        switchView('guru-soal');
    } else {
        Swal.fire({ icon: 'error', title: 'Gagal Menyimpan Soal', text: res.message });
    }
}

function openKoreksiModal(idSub) {
    const sub = (state.cachedData.submissions || []).find(s => String(s.id_sub) === String(idSub));
    if (!sub) return;

    document.getElementById('koreksi-sub-id').value = sub.id_sub;
    document.getElementById('koreksi-siswa-info').textContent = `Siswa: ${sub.nama_siswa} (${sub.kelas}) | Modul: ${sub.tipe_sub.toUpperCase()}`;
    document.getElementById('koreksi-nilai-esai').value = (sub.nilai_esai !== "" && sub.nilai_esai !== null && sub.nilai_esai !== undefined) ? sub.nilai_esai : (sub.skor_otomatis || 80);
    document.getElementById('koreksi-catatan').value = sub.catatan_guru || '';

    let parsedJawaban = sub.jawaban_json;
    try {
        if (typeof sub.jawaban_json === 'string') {
            parsedJawaban = JSON.parse(sub.jawaban_json);
        }
    } catch (e) {
        parsedJawaban = sub.jawaban_json;
    }

    let jawabanHtml = '';

    if (sub.tipe_sub === 'lkpd') {
        if (Array.isArray(parsedJawaban)) {
            jawabanHtml = parsedJawaban.map((ans, idx) => `
                <div class="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <span class="font-bold text-slate-700 text-[11px]">Pertanyaan #${idx + 1}</span>
                    <p class="text-slate-800 font-medium whitespace-pre-wrap bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">${ans ? ans.trim() : '<i class="text-slate-400">(Tidak diisi)</i>'}</p>
                </div>
            `).join('');
        } else {
            jawabanHtml = `<p class="p-3 bg-white rounded-xl border text-slate-800 font-medium whitespace-pre-wrap text-xs">${String(parsedJawaban)}</p>`;
        }
    } else if (sub.tipe_sub === 'evaluasi') {
        if (typeof parsedJawaban === 'object' && parsedJawaban !== null) {
            const soalList = state.cachedData.soal_evaluasi || [];
            jawabanHtml = `<div class="space-y-2">` + Object.keys(parsedJawaban).map((soalId, idx) => {
                const soalObj = soalList.find(s => String(s.id_soal) === String(soalId));
                const userAns = parsedJawaban[soalId];
                const kunci = soalObj ? String(soalObj.kunci_jawaban).toUpperCase() : '';
                const isCorrect = userAns === kunci;
                const qText = soalObj ? soalObj.pertanyaan : `Soal (${soalId})`;

                return `
                    <div class="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                        <div class="flex items-start justify-between gap-2 border-b pb-1">
                            <span class="font-bold text-slate-800 text-xs">#${idx + 1}. ${qText}</span>
                            ${kunci ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}">
                                ${isCorrect ? '✅ Benar' : '❌ Salah'} (Kunci: ${kunci})
                            </span>` : ''}
                        </div>
                        <p class="text-xs font-bold ${isCorrect ? 'text-emerald-600' : 'text-red-600'}">
                            Pilihan Jawaban Siswa: <span class="uppercase border px-2 py-0.5 rounded bg-slate-50">${userAns || '-'}</span>
                        </p>
                    </div>
                `;
            }).join('') + `</div>`;
        } else {
            jawabanHtml = `<p class="p-3 bg-white rounded-xl border text-slate-800 font-medium text-xs">${String(parsedJawaban)}</p>`;
        }
    } else if (sub.tipe_sub === 'game') {
        if (typeof parsedJawaban === 'object' && parsedJawaban !== null) {
            jawabanHtml = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">` + Object.keys(parsedJawaban).map((key, idx) => `
                <div class="p-2.5 bg-white rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                    <span class="font-bold text-slate-500">Item #${idx + 1}</span>
                    <span class="font-bold text-purple-700 uppercase bg-purple-50 px-2 py-0.5 rounded border border-purple-200">${parsedJawaban[key]}</span>
                </div>
            `).join('') + `</div>`;
        } else {
            jawabanHtml = `<p class="p-3 bg-white rounded-xl border text-slate-800 font-medium text-xs">${String(parsedJawaban)}</p>`;
        }
    } else {
        jawabanHtml = `<pre class="bg-white p-2.5 rounded-xl border text-[11px] font-mono text-slate-700 whitespace-pre-wrap">${sub.jawaban_json}</pre>`;
    }

    const body = document.getElementById('koreksi-detail-body');
    body.innerHTML = `
    <div class="p-3 bg-slate-50 border rounded-2xl space-y-2">
      <span class="font-black text-brand-navy block">📌 Isi Lembar Jawaban Siswa</span>
      <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
        ${jawabanHtml}
      </div>
    </div>
    ${sub.canvas_image_base64 ? `<div class="p-3 bg-slate-50 border rounded-2xl"><span class="font-black text-brand-navy block mb-2">🎨 Sketsa Proyek STEAM</span><img src="${sub.canvas_image_base64}" class="max-h-56 rounded-xl border mx-auto bg-white" /></div>` : ''}
  `;

    document.getElementById('koreksi-modal').classList.remove('hidden');
    document.getElementById('koreksi-modal').classList.add('flex');
}

function closeKoreksiModal() { document.getElementById('koreksi-modal').classList.add('hidden'); document.getElementById('koreksi-modal').classList.remove('flex'); }

async function handleGradeSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-grade');
    setButtonLoading(btn, true, '💾 Menyimpan Nilai...', '💾 Simpan Penilaian');

    const res = await apiPost({
        action: 'grade_submisi',
        id_sub: document.getElementById('koreksi-sub-id').value,
        nilai_esai: document.getElementById('koreksi-nilai-esai').value,
        catatan_guru: document.getElementById('koreksi-catatan').value
    });

    setButtonLoading(btn, false, '', '💾 Simpan Penilaian');
    if (res.success) {
        closeKoreksiModal();
        showToast('success', res.message);
        await fetchAllInitialData(true);
        switchView('guru-koreksi');
    } else {
        Swal.fire({ icon: 'error', title: 'Gagal Menyimpan Penilaian', text: res.message });
    }
}

// DELETE HANDLERS
function deletePertemuan(id) {
    showConfirm('Hapus Pertemuan?', 'Data yang dihapus tidak dapat dikembalikan!', async () => {
        showLoading('Menghapus pertemuan...');
        await apiPost({ action: 'delete_pertemuan', id_pertemuan: id });
        closeLoading();
        showToast('success', 'Pertemuan berhasil dihapus');
        await fetchAllInitialData(true);
        switchView('guru-pertemuan');
    });
}

function deleteMateri(id) {
    showConfirm('Hapus Bahan Ajar?', 'Materi pembelajaran ini akan dihapus dari modul!', async () => {
        showLoading('Menghapus materi...');
        await apiPost({ action: 'delete_materi', id_materi: id });
        closeLoading();
        showToast('success', 'Bahan ajar berhasil dihapus');
        await fetchAllInitialData(true);
        switchView('guru-materi');
    });
}

function deleteLkpd(id) {
    showConfirm('Hapus LKPD?', 'LKPD ini akan dihapus!', async () => {
        showLoading('Menghapus LKPD...');
        await apiPost({ action: 'delete_lkpd', id_lkpd: id });
        closeLoading();
        showToast('success', 'LKPD berhasil dihapus');
        await fetchAllInitialData(true);
        switchView('guru-lkpd');
    });
}

function deleteGame(id) {
    showConfirm('Hapus Game Interaktif?', 'Game ini akan dihapus dari modul!', async () => {
        showLoading('Menghapus game...');
        await apiPost({ action: 'delete_game', id_game: id });
        closeLoading();
        showToast('success', 'Game berhasil dihapus');
        await fetchAllInitialData(true);
        switchView('guru-game');
    });
}

function deleteSoal(id) {
    showConfirm('Hapus Soal Evaluasi?', 'Soal ini akan dihapus dari bank soal!', async () => {
        showLoading('Menghapus soal...');
        await apiPost({ action: 'delete_soal_evaluasi', id_soal: id });
        closeLoading();
        showToast('success', 'Soal berhasil dihapus');
        await fetchAllInitialData(true);
        switchView('guru-soal');
    });
}

/* ==========================================================
   13. AUTHENTICATION HANDLERS
   ========================================================== */
async function handleLoginSubmit(e) {
    e.preventDefault();
    const unElem = document.getElementById('login-username');
    const pwElem = document.getElementById('login-password');
    const un = unElem ? unElem.value.trim() : '';
    const pw = pwElem ? pwElem.value.trim() : '';
    const btn = document.getElementById('btn-submit-login');

    setButtonLoading(btn, true, 'Memproses Login...', 'Masuk');
    const res = await apiPost({ action: 'login', username: un, password: pw });
    setButtonLoading(btn, false, '', 'Masuk');

    if (res.success) {
        state.currentUser = res.user;
        closeLoginModal();

        if (unElem) unElem.value = '';
        if (pwElem) pwElem.value = '';

        updateUIForAuthenticatedUser();
        showToast('success', `Selamat Datang, ${res.user.name}!`);

        if (res.user.role === 'guru') switchView('guru-pertemuan');
        else if (res.user.role === 'admin') switchView('admin-users');
        else switchView('home');
    } else {
        Swal.fire({ icon: 'error', title: 'Gagal Login', text: res.message });
    }
}

function openLoginModal() {
    const unElem = document.getElementById('login-username');
    const pwElem = document.getElementById('login-password');
    if (unElem) unElem.value = '';
    if (pwElem) pwElem.value = '';

    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('login-modal').classList.add('flex');
}

function closeLoginModal() {
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('login-modal').classList.remove('flex');
}

function logout() {
    showConfirm('Keluar Sistem?', 'Kamu akan keluar dari akun saat ini.', () => {
        state.currentUser = null;

        const unElem = document.getElementById('login-username');
        const pwElem = document.getElementById('login-password');
        if (unElem) unElem.value = '';
        if (pwElem) pwElem.value = '';

        updateUIForAuthenticatedUser();
        switchView('home');
        showToast('success', 'Berhasil Keluar Akun');
    }, 'Logout');
}

function updateUIForAuthenticatedUser() {
    const nameElem = document.getElementById('user-display-name');
    const roleElem = document.getElementById('user-display-role');
    const badgeElem = document.getElementById('role-badge');
    const authBtn = document.getElementById('auth-action-btn');

    if (state.currentUser) {
        nameElem.textContent = state.currentUser.name;
        roleElem.textContent = state.currentUser.role.toUpperCase();
        badgeElem.textContent = `${state.currentUser.role.toUpperCase()}: ${state.currentUser.name}`;
        badgeElem.className = 'px-3 py-1 bg-blue-100 border border-blue-200 text-brand-blue text-xs font-black rounded-xl';

        authBtn.className = 'w-full py-2.5 bg-red-900/80 text-red-200 font-black rounded-2xl text-xs flex items-center justify-center gap-2 border border-red-800 hover:bg-red-900 transition';
        authBtn.innerHTML = '<span>🚪 Keluar (Logout)</span>';
        authBtn.onclick = logout;
    } else {
        nameElem.textContent = 'Mode Tamu / Guest';
        roleElem.textContent = 'GUEST';
        badgeElem.textContent = 'Mode Tamu';
        badgeElem.className = 'px-3 py-1 bg-slate-100 border text-slate-700 text-xs font-black rounded-xl';

        authBtn.className = 'w-full py-2.5 bg-brand-blue text-white font-black rounded-2xl text-xs shadow flex items-center justify-center gap-2 hover:bg-blue-600 transition';
        authBtn.innerHTML = '<span>🔑 Login Pengguna</span>';
        authBtn.onclick = openLoginModal;
    }
    renderSidebarNav();
}

// INITIALIZATION ON DOM READY
window.addEventListener('DOMContentLoaded', async () => {
    updateUIForAuthenticatedUser();
    await switchView('home');
});