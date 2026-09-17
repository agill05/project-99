import { showToast } from '../components/modal.js';
import { uiState } from '../state.js';

export function startDrawing(e, canvas, ctx) {
  uiState.isDrawing = true;
  ctx.beginPath();
  const c = getCoords(e, canvas);
  ctx.moveTo(c.x, c.y);
}

export function draw(e, canvas, ctx) {
  if (!uiState.isDrawing) return;
  const c = getCoords(e, canvas);
  ctx.lineTo(c.x, c.y);
  ctx.stroke();
}

export function stopDrawing() {
  if (uiState.isDrawing) {
    uiState.isDrawing = false;
    if (document.getElementById('ruang-steam-canvas')) {
      saveStandaloneCanvasState();
    }
  }
}

export function initStandaloneSteamCanvas() {
  const canvas = document.getElementById('ruang-steam-canvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width || 700;
  canvas.height = 380;

  uiState.stCanvasCtx = canvas.getContext('2d');
  uiState.stCanvasCtx.fillStyle = '#FFFFFF';
  uiState.stCanvasCtx.fillRect(0, 0, canvas.width, canvas.height);
  uiState.stCanvasCtx.lineWidth = uiState.stLineWidth;
  uiState.stCanvasCtx.lineCap = 'round';
  uiState.stCanvasCtx.lineJoin = 'round';
  uiState.stCanvasCtx.strokeStyle = uiState.stPenColor;

  uiState.stUndoStack = [];
  saveStandaloneCanvasState();

  canvas.onmousedown = (e) => startDrawing(e, canvas, uiState.stCanvasCtx);
  canvas.onmousemove = (e) => draw(e, canvas, uiState.stCanvasCtx);
  canvas.onmouseup = () => stopDrawing();
  canvas.onmouseleave = () => stopDrawing();

  canvas.ontouchstart = (e) => {
    e.preventDefault();
    startDrawing(e.touches[0], canvas, uiState.stCanvasCtx);
  };
  canvas.ontouchmove = (e) => {
    e.preventDefault();
    draw(e.touches[0], canvas, uiState.stCanvasCtx);
  };
  canvas.ontouchend = (e) => {
    e.preventDefault();
    stopDrawing();
  };
}

export function saveStandaloneCanvasState() {
  const canvas = document.getElementById('ruang-steam-canvas');
  if (canvas && uiState.stCanvasCtx && uiState.stUndoStack.length < 20) {
    uiState.stUndoStack.push(uiState.stCanvasCtx.getImageData(0, 0, canvas.width, canvas.height));
  }
}

export function undoStandaloneCanvas() {
  const canvas = document.getElementById('ruang-steam-canvas');
  if (canvas && uiState.stCanvasCtx && uiState.stUndoStack.length > 1) {
    uiState.stUndoStack.pop();
    const prevState = uiState.stUndoStack[uiState.stUndoStack.length - 1];
    uiState.stCanvasCtx.putImageData(prevState, 0, 0);
  }
}

export function setStandaloneCanvasColor(color) {
  uiState.stPenColor = color;
  if (uiState.stCanvasCtx) uiState.stCanvasCtx.strokeStyle = color;
}

export function setStandaloneCanvasSize(size) {
  uiState.stLineWidth = size;
  if (uiState.stCanvasCtx) uiState.stCanvasCtx.lineWidth = size;
}

export function clearStandaloneCanvas() {
  const canvas = document.getElementById('ruang-steam-canvas');
  if (canvas && uiState.stCanvasCtx) {
    uiState.stCanvasCtx.fillStyle = '#FFFFFF';
    uiState.stCanvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    saveStandaloneCanvasState();
  }
}

export function downloadSteamCanvasImage() {
  const canvas = document.getElementById('ruang-steam-canvas');
  if (!canvas) return;

  const link = document.createElement('a');
  link.download = `Sketsa_Eksperimen_STEAM_${new Date().getTime()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('success', 'Sketsa berhasil diunduh ke perangkat!');
}

export function getCoords(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
  const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height)
  };
}

window.undoStandaloneCanvas = undoStandaloneCanvas;
window.setStandaloneCanvasColor = setStandaloneCanvasColor;
window.setStandaloneCanvasSize = setStandaloneCanvasSize;
window.clearStandaloneCanvas = clearStandaloneCanvas;
window.downloadSteamCanvasImage = downloadSteamCanvasImage;
