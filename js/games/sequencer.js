import { initPointerDragAndDropEngine } from '../games/drag-drop.js';
import { state } from '../state.js';
import { renderGameView } from '../views/game.js';

export function moveSequencerItem(gameId, index, direction, ptmId) {
  const seqState = state.gameStates[gameId];
  if (!seqState || !seqState.sequencerItems) return;

  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= seqState.sequencerItems.length) return;

  const temp = seqState.sequencerItems[index];
  seqState.sequencerItems[index] = seqState.sequencerItems[targetIndex];
  seqState.sequencerItems[targetIndex] = temp;

  const viewport = document.getElementById('content-viewport');
  viewport.innerHTML = renderGameView(ptmId);
  setTimeout(() => initPointerDragAndDropEngine(), 100);
}

// Ekspos ke window agar bisa dipanggil dari atribut onclick/onchange di HTML
window.moveSequencerItem = moveSequencerItem;
