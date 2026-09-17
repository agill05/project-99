import { state } from '../state.js';

export function initPointerDragAndDropEngine() {
  const draggables = document.querySelectorAll('.draggable-item');
  const dropZones = document.querySelectorAll('.drop-zone');

  draggables.forEach((item) => {
    item.removeEventListener('pointerdown', handlePointerDown);
    item.addEventListener('pointerdown', handlePointerDown);
  });

  let activeItem = null;
  let offsetX = 0,
    offsetY = 0;

  function handlePointerDown(e) {
    activeItem = e.currentTarget;
    const rect = activeItem.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    activeItem.setPointerCapture(e.pointerId);
    activeItem.classList.add('dragging');

    activeItem.addEventListener('pointermove', handlePointerMove);
    activeItem.addEventListener('pointerup', handlePointerUp);
    activeItem.addEventListener('pointercancel', handlePointerUp);
  }

  function handlePointerMove(e) {
    if (!activeItem) return;

    activeItem.style.left = `${e.clientX - offsetX}px`;
    activeItem.style.top = `${e.clientY - offsetY}px`;

    dropZones.forEach((zone) => {
      const zRect = zone.getBoundingClientRect();
      if (
        e.clientX >= zRect.left &&
        e.clientX <= zRect.right &&
        e.clientY >= zRect.top &&
        e.clientY <= zRect.bottom
      ) {
        zone.classList.add('drag-over');
      } else {
        zone.classList.remove('drag-over');
      }
    });
  }

  function handlePointerUp(e) {
    if (!activeItem) return;

    activeItem.classList.remove('dragging');
    activeItem.style.left = '';
    activeItem.style.top = '';

    let targetZone = null;
    dropZones.forEach((zone) => {
      const zRect = zone.getBoundingClientRect();
      if (
        e.clientX >= zRect.left &&
        e.clientX <= zRect.right &&
        e.clientY >= zRect.top &&
        e.clientY <= zRect.bottom
      ) {
        targetZone = zone;
      }
      zone.classList.remove('drag-over');
    });

    if (targetZone) {
      const containerItems = targetZone.querySelector('.drop-zone-items') || targetZone;
      containerItems.appendChild(activeItem);

      const gameId = activeItem.getAttribute('data-game-id');
      const itemIdx = activeItem.getAttribute('data-item-idx');
      const catKey = targetZone.getAttribute('data-cat');

      if (!state.gameAnswers[gameId]) state.gameAnswers[gameId] = {};
      state.gameAnswers[gameId][itemIdx] = catKey === 'pool' ? null : catKey;
    }

    activeItem.removeEventListener('pointermove', handlePointerMove);
    activeItem.removeEventListener('pointerup', handlePointerUp);
    activeItem.removeEventListener('pointercancel', handlePointerUp);
    activeItem = null;
  }
}
