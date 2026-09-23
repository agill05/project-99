import { setButtonLoading, showToast } from '../components/modal.js';
import { OCR_FALLBACK_MIN_CHARS } from '../config.js';
import { apiPost } from '../services/api.js';

export function isValidPdfBuffer(buffer) {
  if (!buffer || buffer.byteLength < 5) return false;
  const uint8 = new Uint8Array(buffer);
  return uint8[0] === 0x25 && uint8[1] === 0x50 && uint8[2] === 0x44 && uint8[3] === 0x46;
}

export function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64.replace(/\s/g, ''));
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function fetchPdfArrayBuffer(pdfUrl, fileDriveId = null) {
  if (!pdfUrl) throw new Error('URL PDF tidak valid atau kosong.');

  if (pdfUrl.startsWith('data:application/pdf') || pdfUrl.startsWith('data:base64')) {
    const base64Str = pdfUrl.split(',')[1] || pdfUrl;
    const buf = base64ToArrayBuffer(base64Str);
    if (isValidPdfBuffer(buf)) return buf;
  }

  let driveFileId = fileDriveId;
  if (!driveFileId && (pdfUrl.includes('drive.google.com') || pdfUrl.includes('googleusercontent.com') || pdfUrl.includes('docs.google.com'))) {
    const match = pdfUrl.match(/\/d\/([^\/]+)/) || pdfUrl.match(/id=([^&]+)/);
    if (match && match[1]) driveFileId = match[1];
  }

  if (driveFileId) {
    try {
      const resData = await apiPost({ action: 'get_pdf_base64', fileId: driveFileId });
      if (resData && resData.base64) {
        const buf = base64ToArrayBuffer(resData.base64);
        if (isValidPdfBuffer(buf)) return buf;
      }
    } catch (e) {
      console.warn('API GAS Base64 fetch tidak merespons, mencoba proxy...', e);
    }
  }

  if (driveFileId) {
    const proxyUrls = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent('https://drive.google.com/uc?export=download&id=' + driveFileId)}`,
      `https://corsproxy.io/?${encodeURIComponent('https://drive.google.com/uc?export=download&confirm=t&id=' + driveFileId)}`
    ];

    for (const pUrl of proxyUrls) {
      try {
        const res = await fetch(pUrl);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          if (isValidPdfBuffer(buf)) return buf;
        }
      } catch (e) {
        console.warn('Proxy fetch gagal untuk URL:', pUrl, e);
      }
    }
  }

  try {
    const res = await fetch(pdfUrl);
    if (res.ok) {
      const buf = await res.arrayBuffer();
      if (isValidPdfBuffer(buf)) return buf;
      else throw new Error('Format berkas yang diterima bukan PDF valid (terdeteksi halaman HTML/Error Google Drive).');
    }
  } catch (e) {
    throw new Error(e.message || 'Gagal mengambil berkas PDF.');
  }

  throw new Error('Gagal memuat PDF. Pastikan hak akses file di Google Drive diset ke "Siapa saja yang memiliki link" (Public).');
}

export async function extractTextFromPdfClientSide(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      const items = textContent.items
        .map((it) => ({
          str: it.str,
          x: it.transform[4],
          y: it.transform[5]
        }))
        .filter((it) => it.str && it.str.trim() !== '');

      const lineTolerance = 4;
      const lines = [];
      items.forEach((it) => {
        let line = lines.find((l) => Math.abs(l.y - it.y) < lineTolerance);
        if (!line) {
          line = { y: it.y, items: [] };
          lines.push(line);
        }
        line.items.push(it);
      });

      lines.sort((a, b) => b.y - a.y);
      lines.forEach((l) => l.items.sort((a, b) => a.x - b.x));

      const pageText = lines.map((l) => l.items.map((it) => it.str).join(' ')).join('\n');

      fullText += pageText + '\n\n';
    }
    return fullText.trim();
  } catch (err) {
    console.error('PDF.js Extraction Error:', err);
    return '';
  }
}

export async function requestOcrFallback(fileId) {
  try {
    const res = await apiPost({ action: 'ocr_pdf_drive', fileId });
    if (res.success && res.text) {
      return res.text;
    }
    console.warn('OCR fallback tidak menghasilkan teks:', res.message);
    return '';
  } catch (err) {
    console.error('OCR Fallback Error:', err);
    return '';
  }
}

export async function uploadPdfToDrive(targetModule = 'materi') {
  const isLkpd = targetModule === 'lkpd';
  const fileInput = document.getElementById(isLkpd ? 'lkpd-form-file-pdf' : 'materi-form-file-pdf');
  const btn = document.getElementById(isLkpd ? 'btn-upload-pdf-lkpd' : 'btn-upload-pdf');

  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('warning', 'Pilih file PDF terlebih dahulu!');
    return;
  }

  const file = fileInput.files[0];
  setButtonLoading(btn, true, 'Membaca Teks PDF...', 'Unggah & Ekstrak Teks PDF');

  let extractedText = await extractTextFromPdfClientSide(file);
  let usedOcr = false;

  setButtonLoading(btn, true, 'Mengunggah ke Drive...', 'Unggah & Ekstrak Teks PDF');
  const reader = new FileReader();
  reader.onload = async function (e) {
    const res = await apiPost({
      action: 'upload_pdf',
      base64Data: e.target.result,
      fileName: file.name
    });

    if (res.success && (!extractedText || extractedText.length < OCR_FALLBACK_MIN_CHARS)) {
      setButtonLoading(btn, true, 'Teks Kosong, Menjalankan OCR...', 'Unggah & Ekstrak Teks PDF');
      const ocrText = await requestOcrFallback(res.fileId);
      if (ocrText && ocrText.length > extractedText.length) {
        extractedText = ocrText;
        usedOcr = true;
      }
    }

    setButtonLoading(btn, false, '', 'Unggah & Ekstrak Teks PDF');

    if (res.success) {
      if (isLkpd) {
        const pdfUrlElem = document.getElementById('lkpd-form-pdf-url');
        const pdfIdElem = document.getElementById('lkpd-form-pdf-id');
        const isiTeksElem = document.getElementById('lkpd-form-isi-teks');
        const soalTextElem = document.getElementById('lkpd-form-soal-text');

        if (pdfUrlElem) pdfUrlElem.value = res.url;
        if (pdfIdElem) pdfIdElem.value = res.fileId;

        let textLength = extractedText ? extractedText.length : 0;
        let questionCount = 0;

        if (extractedText) {
          if (isiTeksElem) isiTeksElem.value = extractedText;

          const autoQuestions = parseQuestionsFromText(extractedText);
          questionCount = autoQuestions.length;

          if (questionCount > 0 && soalTextElem) {
            soalTextElem.value = autoQuestions.join('\n');
          }
        }

        Swal.fire({
          icon: textLength > 0 ? 'success' : 'warning',
          title: textLength > 0 ? 'Ekstraksi PDF Berhasil!' : 'PDF Terunggah (Teks Kosong)',
          html: `
                        <div class="text-xs text-left space-y-2 mt-2">
                            <p class="font-bold text-slate-700">Hasil Pemrosesan Berkas PDF:</p>
                            <div class="p-3 ${textLength > 0
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
            } border rounded-xl space-y-1">
                                <p>📝 <b>Panjang Teks Ditampilkan:</b> ${textLength} Karakter</p>
                                <p>❓ <b>Soal Terdeteksi:</b> ${questionCount} Pertanyaan</p>
                                ${usedOcr
              ? `<p>🔍 <b>Metode:</b> OCR (teks asli PDF tidak terbaca / kemungkinan hasil Flatten Canva)</p>`
              : ''
            }
                            </div>
                            <p class="text-slate-500 italic text-[11px]">Teks materi dan daftar soal otomatis diisikan ke dalam form di bawah ini.</p>
                        </div>
                    `
        });
      } else {
        const pdfUrlElem = document.getElementById('materi-form-pdf-url');
        const pdfIdElem = document.getElementById('materi-form-pdf-id');
        if (pdfUrlElem) pdfUrlElem.value = res.url;
        if (pdfIdElem) pdfIdElem.value = res.fileId;
        if (extractedText) {
          const teksElem = document.getElementById('materi-form-teks');
          if (teksElem) teksElem.value = extractedText;
        }
        showToast('success', usedOcr ? 'PDF Diunggah & Diproses via OCR!' : 'PDF Bahan Ajar Berhasil Diunggah!');
      }
    } else {
      Swal.fire({ icon: 'error', title: 'Gagal Unggah PDF', text: res.message });
    }
  };
  reader.readAsDataURL(file);
}

export function parseQuestionsFromText(text) {
  if (!text) return [];

  const cleanText = text.replace(/\r\n/g, '\n').trim();
  const lines = cleanText.split('\n');
  const questions = [];
  let currentQ = '';

  const qRegex = /^(\d+[\.\)]|\(\d+\)|[A-Z][\.\)]|Soal\s*\d+|Pertanyaan\s*\d+)\s*(.+)/i;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (
      trimmed.includes('LEMBAR KERJA PESERTA DIDIK') ||
      trimmed.includes('UNSUR STEAM') ||
      trimmed.includes('PETUNJUK PENGGUNAAN')
    ) {
      return;
    }

    if (qRegex.test(trimmed) || trimmed.endsWith('?')) {
      if (currentQ) questions.push(currentQ.trim());
      currentQ = trimmed;
    } else if (currentQ) {
      currentQ += ' ' + trimmed;
    }
  });

  if (currentQ) questions.push(currentQ.trim());
  return questions;
}

window.uploadPdfToDrive = uploadPdfToDrive;
