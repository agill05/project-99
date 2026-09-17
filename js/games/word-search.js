import { showToast } from '../components/modal.js';
import { state } from '../state.js';
import { renderGameView } from '../views/game.js';

export function checkWordSearchMatch(gameId, ptmId) {
  const inputElem = document.getElementById(`ws-${gameId}-input-word`);
  const wsState = state.gameStates[gameId]?.wordSearchState;
  if (!inputElem || !wsState) return;

  const val = inputElem.value.trim().toUpperCase();
  if (!val) return;

  if (wsState.targetWords.includes(val)) {
    if (!wsState.foundWords.includes(val)) {
      wsState.foundWords.push(val);
      showToast('success', `Hebat! Kata "${val}" ditemukan!`);
      inputElem.value = '';
      const viewport = document.getElementById('content-viewport');
      viewport.innerHTML = renderGameView(ptmId);
    } else {
      showToast('info', 'Kata tersebut sudah kamu temukan!');
    }
  } else {
    showToast('error', 'Kata tersebut tidak ada dalam daftar!');
  }
}

// Ekspos ke window agar bisa dipanggil dari atribut onclick/onchange di HTML
window.checkWordSearchMatch = checkWordSearchMatch;
