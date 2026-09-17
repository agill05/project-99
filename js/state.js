export const SESSION_KEY = 'ELKPD_SESSION_STATE';
export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

export const state = {
  currentUser: null,
  currentView: 'home',
  activePertemuanId: null,
  lastActivity: Date.now(),
  isDataLoaded: false,
  cachedData: {
    users: [],
    kelas: [],
    pertemuan: [],
    materi: [],
    lkpd: [],
    games: [],
    evaluasi: [],
    soal_evaluasi: [],
    submissions: [],
    reviews: []
  },
  evaluasiAnswers: {},
  gameAnswers: {},
  gameStates: {}
};

export function saveSessionState() {
  if (!state.currentUser) {
    sessionStorage.removeItem(SESSION_KEY);
    return;
  }
  const snapshot = {
    user: state.currentUser,
    view: state.currentView,
    paramId: state.activePertemuanId,
    lastActivity: state.lastActivity || Date.now()
  };
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
  } catch (e) {
    console.error('Gagal menyimpan sesi ke sessionStorage:', e);
  }
}

export function loadSessionState() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.user || !data.lastActivity) return null;
    return data;
  } catch (e) {
    return null;
  }
}

export function clearSessionState() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (e) {}
}

let lastSaveTimestamp = 0;
export function touchUserActivity() {
  state.lastActivity = Date.now();
  const now = Date.now();
  if (state.currentUser && now - lastSaveTimestamp > 5000) {
    lastSaveTimestamp = now;
    saveSessionState();
  }
}