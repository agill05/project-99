import { requireStudentAuth, setButtonLoading, showToast } from '../components/modal.js';
import { CACHE_KEY } from '../config.js';
import { apiPost, fetchAllInitialData } from '../services/api.js';
import { fetchPdfArrayBuffer } from '../services/ocr.js';
import { state, uiState } from '../state.js';

export function openModalPetakanFieldGuru(idLkpd) {
  const lkpdObj = (state.cachedData.lkpd || []).find((l) => String(l.id_lkpd) === String(idLkpd));
  if (!lkpdObj) {
    showToast('error', 'Data LKPD tidak ditemukan!');
    return;
  }
  if (!lkpdObj.file_pdf_url) {
    Swal.fire({
      icon: 'warning',
      title: 'PDF Belum Diunggah',
      text: 'Unggah berkas PDF LKPD terlebih dahulu melalui tombol Edit LKPD sebelum memetakan area isian.'
    });
    return;
  }

  let modal = document.getElementById('lkpd-field-map-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'lkpd-field-map-modal';
    modal.className = 'fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-white w-full max-w-5xl h-[90vh] rounded-3xl p-5 flex flex-col space-y-3 shadow-2xl border overflow-hidden">
        <div class="flex items-center justify-between border-b pb-3">
          <div>
            <span class="text-[10px] font-mono font-bold uppercase bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full">Editor Field Mapping PDF</span>
            <h3 id="field-map-modal-title" class="font-black text-brand-navy text-sm font-heading mt-0.5">Pemetaan Area Isian LKPD</h3>
          </div>
          <button onclick="closeModalPetakanFieldGuru()" class="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-xl">Tutup ✖</button>
        </div>
        
        <div class="flex items-center justify-between bg-slate-100 p-2.5 rounded-2xl text-xs">
          <div class="flex items-center gap-2">
            <button onclick="changeGuruPage(-1)" class="px-3 py-1 bg-white border font-bold rounded-xl hover:bg-slate-200 transition">◀ Prev</button>
            <span id="guru-pdf-page-num" class="font-bold text-slate-700">Halaman 1 / 1</span>
            <button onclick="changeGuruPage(1)" class="px-3 py-1 bg-white border font-bold rounded-xl hover:bg-slate-200 transition">Next ▶</button>
          </div>
          <div class="text-[11px] text-slate-500 font-medium hidden sm:block">
            💡 <b>Tips:</b> Klik dan tahan (drag) mouse di atas gambar PDF untuk membuat kotak isian baru & berikan label pada panel kanan.
          </div>
          <button id="btn-save-field-map-guru" class="px-4 py-2 bg-brand-blue text-white font-black rounded-xl shadow hover:bg-blue-700 transition">
            💾 Simpan Peta Field
          </button>
        </div>

        <div class="flex-1 flex gap-4 overflow-hidden">
          <div id="guru-editor-container" class="flex-1 min-w-0 bg-slate-200 rounded-2xl p-4 overflow-auto flex justify-center items-start border"></div>
          <div class="w-64 bg-slate-50 border rounded-2xl p-3 flex flex-col space-y-2 overflow-y-auto text-xs shrink-0">
            <h4 class="font-black text-brand-navy border-b pb-1">Daftar Field Halaman Ini</h4>
            <div id="guru-field-list" class="space-y-2 flex-1"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  document.getElementById('field-map-modal-title').textContent = `Pemetaan Area Isian: ${lkpdObj.judul_lkpd}`;
  document.getElementById('btn-save-field-map-guru').onclick = async () => {
    const btn = document.getElementById('btn-save-field-map-guru');
    setButtonLoading(btn, true, 'Menyimpan...', '💾 Simpan Peta Field');
    await saveFieldMapGuru(lkpdObj.id_lkpd);
    setButtonLoading(btn, false, '', '💾 Simpan Peta Field');
    await fetchAllInitialData(true);
  };

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  const container = document.getElementById('guru-editor-container');
  openFieldMapEditorGuru(container, lkpdObj.file_pdf_url, lkpdObj.peta_field_json, lkpdObj.file_drive_id);
}

export function closeModalPetakanFieldGuru() {
  const modal = document.getElementById('lkpd-field-map-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

export async function openFieldMapEditorGuru(containerEl, pdfUrl, existingFieldMapJson, fileDriveId = null) {
  try {
    uiState.fieldsByPageGuru = existingFieldMapJson ? JSON.parse(existingFieldMapJson).fields || {} : {};
  } catch (e) {
    uiState.fieldsByPageGuru = {};
  }

  let maxNum = 0;
  Object.values(uiState.fieldsByPageGuru).forEach((pageFields) => {
    if (Array.isArray(pageFields)) {
      pageFields.forEach((f) => {
        if (f.id) {
          const match = String(f.id).match(/(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      });
    }
  });
  uiState.fieldCounterGuru = maxNum + 1;
  uiState.currentPageGuru = 1;

  containerEl.innerHTML = `<div class="p-8 text-slate-500 font-bold text-xs text-center">Memuat PDF untuk pemetaan...</div>`;

  try {
    const arrayBuffer = await fetchPdfArrayBuffer(pdfUrl, fileDriveId);
    uiState.currentPdfDocGuru = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    uiState.totalPagesGuru = uiState.currentPdfDocGuru.numPages;

    const firstPage = await uiState.currentPdfDocGuru.getPage(1);
    const naturalViewport = firstPage.getViewport({ scale: 1 });
    const availableWidth = Math.max(containerEl.clientWidth - 32, 280);
    uiState.renderScaleGuru = Math.min(Math.max(availableWidth / naturalViewport.width, 0.4), 2.5);

    containerEl.innerHTML = `
      <div style="position:relative; display:inline-block;" class="shadow-lg border rounded-xl overflow-hidden bg-white">
        <canvas id="guru-pdf-canvas"></canvas>
        <div id="guru-overlay" style="position:absolute; top:0; left:0; right:0; bottom:0; cursor:crosshair;"></div>
      </div>
    `;

    await renderGuruPage();
    attachGuruDrawHandlers();
  } catch (err) {
    console.error('Error loading PDF:', err);
    containerEl.innerHTML = `
      <div class="p-8 text-red-500 font-bold text-xs text-center space-y-2">
        <p>⚠️ Gagal memuat PDF untuk pemetaan.</p>
        <p class="font-mono text-[10px] text-slate-500">${err.message}</p>
        <p class="text-[11px] text-slate-600 font-normal">Pastikan hak akses berkas PDF di Google Drive sudah diatur ke <b>"Siapa saja yang memiliki link" (Public)</b>.</p>
      </div>
    `;
  }
}

export async function renderGuruPage() {
  if (!uiState.currentPdfDocGuru) return;
  const page = await uiState.currentPdfDocGuru.getPage(uiState.currentPageGuru);
  const viewport = page.getViewport({ scale: uiState.renderScaleGuru });
  const canvas = document.getElementById('guru-pdf-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: ctx, viewport }).promise;

  const pageNumElem = document.getElementById('guru-pdf-page-num');
  if (pageNumElem) {
    pageNumElem.textContent = `Halaman ${uiState.currentPageGuru} / ${uiState.totalPagesGuru}`;
  }

  if (!uiState.fieldsByPageGuru[uiState.currentPageGuru]) uiState.fieldsByPageGuru[uiState.currentPageGuru] = [];
  redrawGuruFieldBoxes();
}

export function changeGuruPage(delta) {
  const next = uiState.currentPageGuru + delta;
  if (next < 1 || next > uiState.totalPagesGuru) return;
  uiState.currentPageGuru = next;
  renderGuruPage();
}

export function attachGuruDrawHandlers() {
  const overlay = document.getElementById('guru-overlay');
  if (!overlay) return;
  let drawing = false,
    start = null,
    previewEl = null;

  overlay.onmousedown = (e) => {
    const rect = overlay.getBoundingClientRect();
    drawing = true;
    start = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    previewEl = document.createElement('div');
    previewEl.style.position = 'absolute';
    previewEl.style.border = '2px dashed #d97706';
    previewEl.style.background = 'rgba(217,119,6,0.15)';
    overlay.appendChild(previewEl);
  };

  overlay.onmousemove = (e) => {
    if (!drawing) return;
    const rect = overlay.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;
    const x = Math.min(start.x, curX),
      y = Math.min(start.y, curY);
    const w = Math.abs(curX - start.x),
      h = Math.abs(curY - start.y);
    Object.assign(previewEl.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
  };

  overlay.onmouseup = () => {
    if (!drawing) return;
    drawing = false;
    const rect = overlay.getBoundingClientRect();
    const w = parseFloat(previewEl.style.width);
    const h = parseFloat(previewEl.style.height);
    const x = parseFloat(previewEl.style.left);
    const y = parseFloat(previewEl.style.top);
    if (previewEl.parentNode) overlay.removeChild(previewEl);

    if (w < 15 || h < 10) return;

    const newId = 'field_' + uiState.fieldCounterGuru;
    const newLabel = 'Field ' + uiState.fieldCounterGuru;
    uiState.fieldCounterGuru++;

    uiState.fieldsByPageGuru[uiState.currentPageGuru].push({
      id: newId,
      label: newLabel,
      type: 'text',
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      w: (w / rect.width) * 100,
      h: (h / rect.height) * 100
    });
    redrawGuruFieldBoxes();
  };
}

export function redrawGuruFieldBoxes() {
  const overlay = document.getElementById('guru-overlay');
  if (!overlay) return;
  overlay.querySelectorAll('.guru-field-box').forEach((el) => el.remove());

  const currentFields = uiState.fieldsByPageGuru[uiState.currentPageGuru] || [];
  currentFields.forEach((f) => {
    const box = document.createElement('div');
    box.className = 'guru-field-box';
    Object.assign(box.style, {
      position: 'absolute',
      left: f.x + '%',
      top: f.y + '%',
      width: f.w + '%',
      height: f.h + '%',
      border: '2px dashed #2563eb',
      background: 'rgba(37,99,235,0.12)',
      boxSizing: 'border-box'
    });
    box.title = `${f.label || f.id} (${f.type})`;

    const labelBadge = document.createElement('div');
    labelBadge.className = 'guru-field-badge';
    labelBadge.textContent = f.label || f.id;
    Object.assign(labelBadge.style, {
      position: 'absolute',
      top: '-20px',
      left: '0px',
      background: '#2563eb',
      color: '#ffffff',
      fontSize: '10px',
      fontWeight: 'bold',
      padding: '1px 5px',
      borderRadius: '4px',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      zIndex: '10',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
    });
    box.appendChild(labelBadge);

    overlay.appendChild(box);
  });

  renderGuruFieldListPanel();
}

export function renderGuruFieldListPanel() {
  const listContainer = document.getElementById('guru-field-list');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  const currentFields = uiState.fieldsByPageGuru[uiState.currentPageGuru] || [];
  if (currentFields.length === 0) {
    listContainer.innerHTML = `<p class="text-slate-400 italic text-[11px]">Belum ada kotak isian di halaman ini.</p>`;
    return;
  }

  currentFields.forEach((f) => {
    const item = document.createElement('div');
    item.className = 'p-2 bg-white rounded-xl border space-y-1.5 shadow-2xs';
    item.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-bold text-slate-800 text-[11px] font-mono">${f.id}</span>
        <button onclick="deleteGuruField('${f.id}')" class="text-red-500 font-bold text-[10px] hover:underline">Hapus</button>
      </div>
      <div class="space-y-1">
        <div class="flex items-center gap-1">
          <label class="text-[10px] text-slate-500 font-medium shrink-0 w-10">Label:</label>
          <input type="text" value="${(f.label || f.id).replace(/"/g, '&quot;')}" onchange="changeGuruFieldLabel('${f.id}', this.value)" placeholder="Label field..." class="w-full p-1 text-[10px] border rounded-lg font-bold bg-slate-50 text-brand-navy" />
        </div>
        <div class="flex items-center gap-1">
          <label class="text-[10px] text-slate-500 font-medium shrink-0 w-10">Tipe:</label>
          <select onchange="changeGuruFieldType('${f.id}', this.value)" class="w-full p-1 text-[10px] border rounded-lg font-bold bg-slate-50">
            <option value="text" ${f.type === 'text' ? 'selected' : ''}>Input Teks Singkat</option>
            <option value="textarea" ${f.type === 'textarea' ? 'selected' : ''}>Textarea Paragraf</option>
          </select>
        </div>
      </div>
    `;
    listContainer.appendChild(item);
  });
}

export function changeGuruFieldLabel(fieldId, newLabel) {
  const f = (uiState.fieldsByPageGuru[uiState.currentPageGuru] || []).find((x) => x.id === fieldId);
  if (f) {
    f.label = newLabel.trim() || fieldId;
    redrawGuruFieldBoxes();
  }
}

export function changeGuruFieldType(fieldId, newType) {
  const f = (uiState.fieldsByPageGuru[uiState.currentPageGuru] || []).find((x) => x.id === fieldId);
  if (f) {
    f.type = newType;
    redrawGuruFieldBoxes();
  }
}

export function deleteGuruField(fieldId) {
  uiState.fieldsByPageGuru[uiState.currentPageGuru] = (uiState.fieldsByPageGuru[uiState.currentPageGuru] || []).filter((f) => f.id !== fieldId);
  redrawGuruFieldBoxes();
}

export async function saveFieldMapGuru(idLkpd) {
  const payload = {
    totalPages: uiState.totalPagesGuru,
    renderScale: uiState.renderScaleGuru,
    fields: uiState.fieldsByPageGuru
  };

  const res = await apiPost({
    action: 'save_field_map_lkpd',
    id_lkpd: idLkpd,
    peta_field_json: JSON.stringify(payload)
  });

  if (res.success) {
    showToast('success', 'Peta isian LKPD berhasil disimpan!');
  } else {
    Swal.fire({ icon: 'error', title: 'Gagal Menyimpan Peta Field', text: res.message });
  }
  return res;
}

export async function renderLkpdUntukSiswa(containerEl, lkpdObj, ptmId) {
  const user = state.currentUser || { username: 'guest' };
  if (!lkpdObj.peta_field_json) return;

  containerEl.innerHTML = `<div class="p-6 text-center text-slate-500 font-bold text-xs">Memuat Lembar Isian LKPD...</div>`;

  try {
    const fieldMap = JSON.parse(lkpdObj.peta_field_json);
    const arrayBuffer = await fetchPdfArrayBuffer(lkpdObj.file_pdf_url, lkpdObj.file_drive_id);
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const jawabanRes = await apiPost({
      action: 'get_jawaban_lkpd_isian',
      id_lkpd: lkpdObj.id_lkpd,
      username_siswa: user.username
    });

    const savedServerAnswers = jawabanRes.success && jawabanRes.jawaban ? jawabanRes.jawaban : {};
    const localDraft = getLkpdOverlayDraft(lkpdObj.id_lkpd);
    const combinedAnswers = { ...savedServerAnswers, ...localDraft };

    uiState.currentActiveLkpdContext = { ptmId, idLkpd: lkpdObj.id_lkpd, pdfDoc, fieldMap, savedAnswers: combinedAnswers };

    containerEl.innerHTML = `
      <div class="w-full space-y-4">
        
        <!-- TAMPILAN KHUSUS MOBILE (HP/Tablet < 768px) -->
        <div class="block md:hidden space-y-3 text-center p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-xs">
          <span class="px-2.5 py-1 bg-purple-100 text-purple-800 font-bold rounded-xl text-[10px] inline-block uppercase font-mono">
            📱 Mode Mobile
          </span>
          <h5 class="font-black text-brand-navy text-xs">Lembar Kerja PDF Interaktif</h5>
          <p class="text-[11px] text-slate-600 font-medium max-w-xs mx-auto">
            Buka mode layar penuh untuk kenyamanan membaca dan mengetik jawaban di layar HP kamu.
          </p>
          <button onclick="openLkpdFullscreenModal('${ptmId}', '${lkpdObj.id_lkpd}')" class="w-full px-5 py-3.5 bg-brand-purple hover:bg-purple-700 text-white font-black rounded-2xl shadow-md transition flex items-center justify-center gap-2 text-xs">
            <span>🖥️ Buka Layar Penuh (Fullscreen)</span>
          </button>
        </div>

        <!-- TAMPILAN KHUSUS DESKTOP (Laptop/PC >= 768px) -->
        <div id="desktop-inline-lkpd-wrap" class="hidden md:block space-y-4 w-full">
          <div id="desktop-lkpd-pages" class="space-y-4 flex flex-col items-center"></div>
          <button id="btn-simpan-jawaban-lkpd-desktop" class="w-full py-3.5 bg-brand-blue hover:bg-blue-700 text-white font-black rounded-2xl shadow transition text-xs">
            💾 Simpan Jawaban LKPD Overlay
          </button>
        </div>

      </div>
    `;

    const desktopPagesWrap = document.getElementById('desktop-lkpd-pages');
    if (desktopPagesWrap) {
      await renderDesktopInlinePdfPages(desktopPagesWrap, pdfDoc, fieldMap, combinedAnswers, lkpdObj.id_lkpd);
    }

    const btnSaveDesktop = document.getElementById('btn-simpan-jawaban-lkpd-desktop');
    if (btnSaveDesktop) {
      btnSaveDesktop.onclick = () => submitJawabanLkpdIsian(ptmId, lkpdObj.id_lkpd);
    }

    if (Object.keys(localDraft).length > 0) {
      showToast('info', 'Draft pengerjaan PDF Overlay dipulihkan!');
    }
  } catch (err) {
    console.error('Error rendering student PDF overlay:', err);
    containerEl.innerHTML = `<div class="p-4 text-center text-red-500 font-bold text-xs">Gagal memuat PDF Interaktif (${err.message})</div>`;
  }
}

export async function renderDesktopInlinePdfPages(containerWrap, pdfDoc, fieldMap, savedAnswers, idLkpd) {
  containerWrap.innerHTML = '';
  const firstPage = await pdfDoc.getPage(1);
  const naturalViewport = firstPage.getViewport({ scale: 1 });
  const availableWidth = Math.max(containerWrap.clientWidth || 750, 600);
  const renderScale = Math.min(Math.max(availableWidth / naturalViewport.width, 0.8), fieldMap.renderScale || 1.4);

  for (let pageNum = 1; pageNum <= fieldMap.totalPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: renderScale });

    const pageWrap = document.createElement('div');
    pageWrap.style.position = 'relative';
    pageWrap.style.width = viewport.width + 'px';
    pageWrap.style.height = viewport.height + 'px';
    pageWrap.className = 'shadow-md rounded-xl overflow-hidden bg-white border shrink-0 mx-auto';

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    pageWrap.appendChild(canvas);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

    const fields = fieldMap.fields[pageNum] || [];
    fields.forEach((f) => {
      const el = document.createElement(f.type === 'textarea' ? 'textarea' : 'input');
      if (f.type !== 'textarea') el.type = 'text';
      el.className = 'lkpd-fill-input';
      el.dataset.fieldId = f.id;
      el.placeholder = f.label || f.id;
      el.title = f.label || f.id;
      el.value = savedAnswers[f.id] || '';

      el.oninput = () => saveLkpdOverlayDraft(idLkpd);

      const calculatedFontSize = Math.max(Math.min(14, Math.round(11 * renderScale)), 10);

      Object.assign(el.style, {
        position: 'absolute',
        left: f.x + '%',
        top: f.y + '%',
        width: f.w + '%',
        height: f.h + '%',
        border: '1.5px solid #2563eb',
        background: 'rgba(255, 255, 255, 0.92)',
        fontFamily: 'inherit',
        fontSize: calculatedFontSize + 'px',
        padding: '3px 6px',
        borderRadius: '6px',
        boxSizing: 'border-box'
      });
      pageWrap.appendChild(el);
    });

    containerWrap.appendChild(pageWrap);
  }
}

export async function renderLkpdInlineContainer(containerEl, pdfDoc, fieldMap, savedAnswers, ptmId, idLkpd) {
  containerEl.innerHTML = `
    <div class="space-y-3 w-full text-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
      <h5 class="font-bold text-brand-navy text-xs">Lembar Kerja PDF Interaktif</h5>
      <p class="text-[11px] text-slate-600 font-medium max-w-sm mx-auto">
        Klik tombol di bawah ini untuk membuka lembar pengerjaan layar penuh (Fullscreen) yang nyaman dan pas di layar HP.
      </p>
      <button onclick="openLkpdFullscreenModal('${ptmId}', '${idLkpd}')" class="w-full sm:w-auto px-6 py-3.5 bg-brand-purple hover:bg-purple-700 text-white font-black rounded-2xl shadow-lg transition inline-flex items-center justify-center gap-2 text-xs">
        <span>Buka Layar Penuh (Fullscreen)</span>
      </button>
    </div>
  `;
}

export async function openLkpdFullscreenModal(ptmId, idLkpd) {
  const lkpdObj = (state.cachedData.lkpd || []).find((l) => String(l.id_lkpd) === String(idLkpd));
  if (!lkpdObj) return;

  const modal = document.getElementById('lkpd-fullscreen-modal');
  const titleElem = document.getElementById('lkpd-fullscreen-title');
  const contentWrap = document.getElementById('lkpd-fullscreen-content');

  if (titleElem) titleElem.textContent = lkpdObj.judul_lkpd;

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  document.getElementById('btn-floating-save-lkpd').onclick = () => submitJawabanLkpdIsian(ptmId, idLkpd);

  if (uiState.currentActiveLkpdContext.pdfDoc && uiState.currentActiveLkpdContext.idLkpd === idLkpd) {
    await drawLkpdFullscreenPages(contentWrap);
  } else {
    contentWrap.innerHTML = `<div class="p-8 text-white font-bold text-xs">Memuat PDF...</div>`;
    const user = state.currentUser || { username: 'guest' };
    const fieldMap = JSON.parse(lkpdObj.peta_field_json);
    const arrayBuffer = await fetchPdfArrayBuffer(lkpdObj.file_pdf_url, lkpdObj.file_drive_id);
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const jawabanRes = await apiPost({
      action: 'get_jawaban_lkpd_isian',
      id_lkpd: lkpdObj.id_lkpd,
      username_siswa: user.username
    });

    const savedServerAnswers = jawabanRes.success && jawabanRes.jawaban ? jawabanRes.jawaban : {};
    const localDraft = getLkpdOverlayDraft(idLkpd);
    const combinedAnswers = { ...savedServerAnswers, ...localDraft };

    uiState.currentActiveLkpdContext = { ptmId, idLkpd, pdfDoc, fieldMap, savedAnswers: combinedAnswers };
    await drawLkpdFullscreenPages(contentWrap);
  }
}

export function closeLkpdFullscreenModal() {
  const modal = document.getElementById('lkpd-fullscreen-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

export async function drawLkpdFullscreenPages(containerEl) {
  const { pdfDoc, fieldMap, savedAnswers, idLkpd } = uiState.currentActiveLkpdContext;
  if (!pdfDoc || !fieldMap) return;

  containerEl.innerHTML = '';
  const scrollBody = document.getElementById('lkpd-fullscreen-scroll-body');
  const viewportWidth = scrollBody.clientWidth - 24;

  const firstPage = await pdfDoc.getPage(1);
  const naturalViewport = firstPage.getViewport({ scale: 1 });

  let renderScale = 1.0;
  if (uiState.activeLkpdFitMode === 'fit') {
    renderScale = Math.max(viewportWidth / naturalViewport.width, 0.45);
    uiState.activeLkpdScale = renderScale;
  } else {
    renderScale = uiState.activeLkpdScale;
  }

  document.getElementById('lkpd-zoom-text').textContent = `${Math.round((renderScale / (viewportWidth / naturalViewport.width)) * 100)}%`;

  for (let pageNum = 1; pageNum <= fieldMap.totalPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: renderScale });

    const pageWrap = document.createElement('div');
    pageWrap.className = 'lkpd-fullscreen-page-wrap relative bg-white rounded-xl overflow-hidden mb-6 border shrink-0';
    pageWrap.style.width = viewport.width + 'px';
    pageWrap.style.height = viewport.height + 'px';

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    pageWrap.appendChild(canvas);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

    const fields = fieldMap.fields[pageNum] || [];
    fields.forEach((f) => {
      const el = document.createElement(f.type === 'textarea' ? 'textarea' : 'input');
      if (f.type !== 'textarea') el.type = 'text';
      el.className = 'lkpd-fill-input';
      el.dataset.fieldId = f.id;
      el.placeholder = f.label || f.id;
      el.title = f.label || f.id;

      const currentVal = document.querySelector(`.lkpd-fill-input[data-field-id="${f.id}"]`)?.value;
      el.value = currentVal !== undefined ? currentVal : (savedAnswers[f.id] || '');

      el.oninput = () => saveLkpdOverlayDraft(idLkpd);

      const calculatedFontSize = Math.max(Math.min(15, Math.round(12 * (renderScale / 1.2))), 10);

      Object.assign(el.style, {
        position: 'absolute',
        left: f.x + '%',
        top: f.y + '%',
        width: f.w + '%',
        height: f.h + '%',
        border: '1.5px solid #2563eb',
        background: 'rgba(255, 255, 255, 0.92)',
        fontFamily: 'inherit',
        fontSize: calculatedFontSize + 'px',
        padding: '3px 6px',
        borderRadius: '6px',
        boxSizing: 'border-box'
      });
      pageWrap.appendChild(el);
    });

    containerEl.appendChild(pageWrap);
  }
}

export function setLkpdZoomMode(mode) {
  uiState.activeLkpdFitMode = mode;
  const contentWrap = document.getElementById('lkpd-fullscreen-content');
  if (contentWrap) drawLkpdFullscreenPages(contentWrap);
}

export function changeLkpdZoom(delta) {
  uiState.activeLkpdFitMode = 'custom';
  uiState.activeLkpdScale = Math.min(Math.max(uiState.activeLkpdScale + delta, 0.4), 2.5);
  const contentWrap = document.getElementById('lkpd-fullscreen-content');
  if (contentWrap) drawLkpdFullscreenPages(contentWrap);
}

export async function submitJawabanLkpdIsian(ptmId, idLkpd) {
  const user = state.currentUser;
  if (!user) {
    requireStudentAuth();
    return;
  }

  const jawaban = {};
  document.querySelectorAll('.lkpd-fill-input').forEach((el) => {
    if (el.dataset.fieldId) {
      jawaban[el.dataset.fieldId] = el.value;
    }
  });

  const btn = document.getElementById('btn-simpan-jawaban-lkpd');
  setButtonLoading(btn, true, '🚀 Mengirim...', '💾 Simpan Jawaban LKPD Overlay');

  const res = await apiPost({
    action: 'submit_lkpd_isian',
    id_pertemuan: ptmId,
    id_lkpd: idLkpd,
    username_siswa: user.username,
    nama_siswa: user.name,
    kelas: user.kelas,
    jawaban_json: JSON.stringify(jawaban)
  });

  setButtonLoading(btn, false, '', '💾 Simpan Jawaban LKPD Overlay');

  if (res.success) {
    clearLkpdOverlayDraft(idLkpd);
    showToast('success', 'Jawaban LKPD Overlay tersimpan!');
  } else {
    Swal.fire({ icon: 'error', title: 'Gagal Menyimpan Jawaban', text: res.message });
  }
}

export function saveLkpdOverlayDraft(idLkpd) {
  const username = state.currentUser ? state.currentUser.username : 'guest';
  const draftKey = `${CACHE_KEY}_DRAFT_OVERLAY_${idLkpd}_${username}`;
  const jawaban = {};
  document.querySelectorAll('.lkpd-fill-input').forEach((el) => {
    if (el.dataset.fieldId) {
      jawaban[el.dataset.fieldId] = el.value;
    }
  });
  localStorage.setItem(draftKey, JSON.stringify({ jawaban, timestamp: new Date().toISOString() }));
}

export function getLkpdOverlayDraft(idLkpd) {
  const username = state.currentUser ? state.currentUser.username : 'guest';
  const draftKey = `${CACHE_KEY}_DRAFT_OVERLAY_${idLkpd}_${username}`;
  try {
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed && parsed.jawaban ? parsed.jawaban : {};
    }
  } catch (e) {
    console.error('Gagal membaca draft overlay:', e);
  }
  return {};
}

export function clearLkpdOverlayDraft(idLkpd) {
  const username = state.currentUser ? state.currentUser.username : 'guest';
  const draftKey = `${CACHE_KEY}_DRAFT_OVERLAY_${idLkpd}_${username}`;
  localStorage.removeItem(draftKey);
}

window.openModalPetakanFieldGuru = openModalPetakanFieldGuru;
window.closeModalPetakanFieldGuru = closeModalPetakanFieldGuru;
window.changeGuruPage = changeGuruPage;
window.changeGuruFieldLabel = changeGuruFieldLabel;
window.changeGuruFieldType = changeGuruFieldType;
window.deleteGuruField = deleteGuruField;
window.openLkpdFullscreenModal = openLkpdFullscreenModal;
window.closeLkpdFullscreenModal = closeLkpdFullscreenModal;
window.setLkpdZoomMode = setLkpdZoomMode;
window.changeLkpdZoom = changeLkpdZoom;
