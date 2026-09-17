import { state } from '../state.js';

export function setQuizChoice(gameId, idx, choice) {
  if (!state.gameAnswers[gameId]) state.gameAnswers[gameId] = {};
  state.gameAnswers[gameId][idx] = choice;

  const btnA = document.getElementById(`gm-${gameId}-quiz-${idx}-A`);
  const btnB = document.getElementById(`gm-${gameId}-quiz-${idx}-B`);
  if (choice === 'A') {
    btnA.className = 'p-2.5 rounded-xl border-2 border-brand-blue bg-blue-50 font-bold text-brand-blue text-left';
    btnB.className = 'p-2.5 rounded-xl border bg-white font-bold text-left';
  } else {
    btnA.className = 'p-2.5 rounded-xl border bg-white font-bold text-left';
    btnB.className = 'p-2.5 rounded-xl border-2 border-purple-600 bg-purple-50 font-bold text-purple-600 text-left';
  }
}

// Ekspos ke window agar bisa dipanggil dari atribut onclick/onchange di HTML
window.setQuizChoice = setQuizChoice;
