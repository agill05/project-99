import { requireStudentAuth, setButtonLoading } from '../components/modal.js';
import { apiPost, fetchAllInitialData } from '../services/api.js';
import { state } from '../state.js';

export function renderEvaluasiView(ptmId) {
  const evalObj = (state.cachedData.evaluasi || []).find((e) => e.id_pertemuan === ptmId && e.status === 'Publish');
  if (!evalObj) return `<div class="p-8 text-center text-slate-400">Evaluasi belum tersedia pada pertemuan ini.</div>`;

  const soalList = (state.cachedData.soal_evaluasi || []).filter((s) => s.id_evaluasi === evalObj.id_evaluasi);
  if (soalList.length === 0) return `<div class="p-8 text-center text-slate-400">Belum ada soal pada modul evaluasi ini.</div>`;

  return `
    <div class="max-w-4xl mx-auto space-y-4 text-xs">
      <div class="bg-brand-navy text-white p-5 rounded-3xl shadow-md">
        <h3 class="text-base font-black font-heading">${evalObj.judul_evaluasi}</h3>
        <span class="text-[11px] text-slate-300">Durasi: ${evalObj.durasi_menit} Menit | Total: ${soalList.length} Soal</span>
      </div>

      <div class="space-y-4">
        ${soalList
      .map(
        (s, idx) => `
          <div class="bg-white p-5 rounded-3xl border space-y-3">
            <span class="font-black text-brand-navy">Soal #${idx + 1}</span>
            <p class="font-bold text-slate-800">${s.pertanyaan}</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              ${['A', 'B', 'C', 'D']
            .map(
              (o) => `
                <button id="eval-opt-${s.id_soal}-${o}" onclick="selectEvalOption('${s.id_soal}', '${o}')" class="w-full p-3 text-left rounded-2xl border bg-white hover:bg-slate-50 font-medium transition flex items-center gap-2">
                  <span class="w-6 h-6 rounded-xl bg-slate-100 font-black text-[10px] flex items-center justify-center border">${o}</span>
                  <span>${s['opsi_' + o.toLowerCase()]}</span>
                </button>
              `
            )
            .join('')}
            </div>
          </div>
        `
      )
      .join('')}
      </div>

      <button id="btn-submit-eval-siswa" onclick="requireStudentAuth(() => submitEvaluasiSiswa('${ptmId}', '${evalObj.id_evaluasi}'))" class="w-full py-4 bg-brand-emerald text-white font-black rounded-2xl shadow hover:bg-emerald-600 transition">
        🚀 Kirim Jawaban Evaluasi & Hitung Skor
      </button>
    </div>
  `;
}

export function selectEvalOption(soalId, option) {
  state.evaluasiAnswers[soalId] = option;
  ['A', 'B', 'C', 'D'].forEach((o) => {
    const btn = document.getElementById(`eval-opt-${soalId}-${o}`);
    if (btn)
      btn.className =
        state.evaluasiAnswers[soalId] === o
          ? 'w-full p-3 text-left rounded-2xl border-2 border-brand-blue bg-blue-50 font-bold text-brand-blue'
          : 'w-full p-3 text-left rounded-2xl border bg-white font-medium';
  });
}

export async function submitEvaluasiSiswa(ptmId, idEvaluasi) {
  const soalList = (state.cachedData.soal_evaluasi || []).filter((s) => s.id_evaluasi === idEvaluasi);
  let benar = 0;
  soalList.forEach((s) => {
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
    Swal.fire({
      icon: 'success',
      title: 'Evaluasi Selesai!',
      html: `Skor Kamu: <b class="text-2xl text-brand-blue block mt-1">${score} / 100</b>`
    });
  } else {
    Swal.fire({ icon: 'error', title: 'Gagal Mengirim Evaluasi', text: res.message });
  }
}

// Ekspos ke window agar bisa dipanggil dari atribut onclick/onchange di HTML
window.selectEvalOption = selectEvalOption;
window.submitEvaluasiSiswa = submitEvaluasiSiswa;
