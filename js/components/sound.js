const SOUND_PREF_KEY = 'ELKPD_SOUND_ENABLED';
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

export function isSoundEnabled() {
    const saved = localStorage.getItem(SOUND_PREF_KEY);
    return saved === null ? true : saved === '1';
}

export function setSoundEnabled(enabled) {
    localStorage.setItem(SOUND_PREF_KEY, enabled ? '1' : '0');
    updateSoundToggleUI();
}

export function toggleSound() {
    const next = !isSoundEnabled();
    setSoundEnabled(next);
    if (next) playClick();
}

export function updateSoundToggleUI() {
    const btn = document.getElementById('sound-toggle-btn');
    if (!btn) return;
    const on = isSoundEnabled();
    btn.textContent = on ? '🔊' : '🔇';
    btn.title = on ? 'Suara aktif — klik untuk matikan' : 'Suara mati — klik untuk aktifkan';
}

function playTone(freq, duration, type = 'sine', volume = 0.15, delay = 0) {
    if (!isSoundEnabled()) return;
    const ctx = getAudioCtx();
    if (!ctx) return;

    const startTime = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
}

export function playClick() {
    playTone(700, 0.06, 'square', 0.08);
}

export function playSuccess() {
    playTone(523.25, 0.12, 'sine', 0.15);     
    playTone(783.99, 0.18, 'sine', 0.15, 0.1);
}

export function playError() {
    playTone(300, 0.15, 'sawtooth', 0.12);
    playTone(180, 0.2, 'sawtooth', 0.12, 0.12);
}

export function playWarning() {
    playTone(440, 0.1, 'triangle', 0.12);
}
const NO_SOUND_ATTR = 'data-no-sound';
let globalClickBound = false;

export function initGlobalClickFeedback() {
    if (globalClickBound) return;
    globalClickBound = true;

    document.addEventListener(
        'click',
        (e) => {
            const target = e.target.closest('button, a, [onclick], select, input[type="radio"], input[type="checkbox"]');
            if (!target || target.closest(`[${NO_SOUND_ATTR}]`)) return;
            if (target.id === 'sound-toggle-btn') return;
            playClick();
        },
        true
    );
}

window.toggleSound = toggleSound;
