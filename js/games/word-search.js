import { showToast } from '../components/modal.js';
import { state } from '../state.js';

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

      const badgesContainer = document.getElementById(`ws-${gameId}-badges`);
      if (badgesContainer) {
        badgesContainer.innerHTML = wsState.targetWords
          .map(
            (w) => `
            <span class="px-2.5 py-1 rounded-xl text-xs font-black ${
              wsState.foundWords.includes(w)
                ? 'bg-emerald-500 text-white line-through'
                : 'bg-white border text-purple-800'
            }">${w}</span>
          `
          )
          .join('');
      }
    } else {
      showToast('info', 'Kata tersebut sudah kamu temukan!');
    }
  } else {
    showToast('error', 'Kata tersebut tidak ada dalam daftar!');
  }
}

window.checkWordSearchMatch = checkWordSearchMatch;