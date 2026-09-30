let deferredPrompt = null;
let installBtn = null;

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function ensureButton() {
  if (installBtn) return installBtn;
  const anchor = document.getElementById('auth-action-btn');
  if (!anchor || !anchor.parentElement) return null;

  installBtn = document.createElement('button');
  installBtn.id = 'pwa-install-btn';
  installBtn.type = 'button';
  installBtn.className =
    'hidden w-full mb-2 py-2.5 bg-brand-yellow hover:bg-yellow-400 text-brand-navy font-black rounded-2xl text-xs transition shadow-lg items-center justify-center gap-2';
  installBtn.innerHTML = '<span>📲 Install Aplikasi</span>';
  installBtn.addEventListener('click', handleInstallClick);
  anchor.parentElement.insertBefore(installBtn, anchor);
  return installBtn;
}

function setVisible(show) {
  const btn = ensureButton();
  if (!btn) return;
  btn.classList.toggle('hidden', !show);
  btn.classList.toggle('flex', show);
}

async function handleInstallClick() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (outcome === 'accepted') setVisible(false);
    return;
  }
  if (isIOS() && window.Swal) {
    window.Swal.fire({
      title: 'Install di iPhone / iPad',
      html:
        '<div style="text-align:left;font-size:14px;line-height:1.6">' +
        '1. Buka lewat <b>Safari</b>.<br>' +
        '2. Ketuk tombol <b>Bagikan</b> (kotak dengan panah ke atas).<br>' +
        '3. Pilih <b>Tambah ke Layar Utama</b>.<br>' +
        '4. Ketuk <b>Tambah</b>.</div>',
      icon: 'info',
      confirmButtonText: 'Mengerti'
    });
  }
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!isStandalone()) setVisible(true);
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  setVisible(false);
});

function init() {
  if (isStandalone()) return;
  ensureButton();
  if (isIOS()) setVisible(true);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
