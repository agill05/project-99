export function renderHomeView() {
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
