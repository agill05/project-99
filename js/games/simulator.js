import { state } from '../state.js';

export function setSimChoice(gameId, idx, choice) {
  if (!state.gameAnswers[gameId]) state.gameAnswers[gameId] = {};
  state.gameAnswers[gameId][idx] = choice;

  ['A', 'B', 'C'].forEach((ch) => {
    const btn = document.getElementById(`gm-${gameId}-sim-${idx}-${ch}`);
    if (btn) {
      btn.className =
        choice === ch
          ? 'p-2.5 rounded-xl border-2 border-purple-600 bg-purple-50 font-bold text-purple-700 text-left text-xs'
          : 'p-2.5 rounded-xl border bg-slate-50 font-bold text-left text-xs';
    }
  });
}

// Ekspos ke window agar bisa dipanggil dari atribut onclick/onchange di HTML
window.setSimChoice = setSimChoice;
