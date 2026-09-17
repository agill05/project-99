export const state = {
  currentUser: null,
  currentView: 'home',
  activePertemuanId: null,
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

export const uiState = {
  activeLkpdScale: 1.0,
  activeLkpdFitMode: 'fit',
  currentActiveLkpdContext: { ptmId: null, idLkpd: null, pdfDoc: null, fieldMap: null, savedAnswers: {} },
  activeSelectedLeftDot: null,
  currentPdfDocGuru: null,
  currentPageGuru: 1,
  totalPagesGuru: 1,
  fieldsByPageGuru: {},
  fieldCounterGuru: 1,
  renderScaleGuru: 1.5,
  currentLkpdScaleMultiplier: 1.0,
  isDrawing: false,
  stCanvasCtx: null,
  stPenColor: '#0B2545',
  stLineWidth: 3,
  stUndoStack: []
};
