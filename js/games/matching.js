import { showToast } from '../components/modal.js';
import { state, uiState } from '../state.js';

export function handleMatchingResize() {
  redrawAllMatchingLines();
}

export function initMatchingLineEngine() {
  const leftDots = document.querySelectorAll('.matching-dot.left-dot');
  const rightDots = document.querySelectorAll('.matching-dot.right-dot');

  leftDots.forEach((dot) => {
    dot.removeEventListener('pointerdown', handleDotPointerDown);
    dot.addEventListener('pointerdown', handleDotPointerDown);
  });

  rightDots.forEach((dot) => {
    dot.removeEventListener('click', handleRightDotClick);
    dot.addEventListener('click', handleRightDotClick);
  });

  window.removeEventListener('resize', handleMatchingResize);
  window.addEventListener('resize', handleMatchingResize);
}

export function handleDotPointerDown(e) {
  e.preventDefault();
  const startDot = e.currentTarget;
  const gameId = startDot.getAttribute('data-game-id');
  const leftIdx = startDot.getAttribute('data-left-idx');

  if (uiState.activeSelectedLeftDot && uiState.activeSelectedLeftDot !== startDot) {
    uiState.activeSelectedLeftDot.classList.remove('ring-4', 'ring-amber-400');
  }
  uiState.activeSelectedLeftDot = startDot;
  startDot.classList.add('ring-4', 'ring-amber-400');

  const container = document.getElementById(`matching-container-${gameId}`);
  const svg = document.getElementById(`matching-svg-${gameId}`);
  if (!container || !svg) return;

  const cRect = container.getBoundingClientRect();
  const dRect = startDot.getBoundingClientRect();

  const x1 = dRect.left + dRect.width / 2 - cRect.left;
  const y1 = dRect.top + dRect.height / 2 - cRect.top;

  const existingLine = svg.querySelector(`line[data-left-idx="${leftIdx}"]`);
  if (existingLine) existingLine.remove();

  const tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  tempLine.setAttribute('x1', x1);
  tempLine.setAttribute('y1', y1);
  tempLine.setAttribute('x2', x1);
  tempLine.setAttribute('y2', y1);
  tempLine.setAttribute('stroke', '#6B38FB');
  tempLine.setAttribute('stroke-width', '4');
  tempLine.setAttribute('stroke-linecap', 'round');
  tempLine.setAttribute('data-left-idx', leftIdx);
  svg.appendChild(tempLine);

  let isDragging = false;
  startDot.setPointerCapture(e.pointerId);

  function onPointerMove(ev) {
    isDragging = true;
    const curX = ev.clientX - cRect.left;
    const curY = ev.clientY - cRect.top;
    tempLine.setAttribute('x2', curX);
    tempLine.setAttribute('y2', curY);
  }

  function onPointerUp(ev) {
    startDot.removeEventListener('pointermove', onPointerMove);
    startDot.removeEventListener('pointerup', onPointerUp);

    if (!isDragging) return;

    const targetElem = document.elementFromPoint(ev.clientX, ev.clientY);
    const targetDot = targetElem ? targetElem.closest('.matching-dot.right-dot') : null;

    if (targetDot && targetDot.getAttribute('data-game-id') === gameId) {
      connectDots(startDot, targetDot, tempLine, gameId, leftIdx);
    } else {
      tempLine.remove();
      if (state.gameAnswers[gameId]) delete state.gameAnswers[gameId][leftIdx];
    }
  }

  startDot.addEventListener('pointermove', onPointerMove);
  startDot.addEventListener('pointerup', onPointerUp);
}

export function handleRightDotClick(e) {
  if (!uiState.activeSelectedLeftDot) return;

  const rightDot = e.currentTarget;
  const gameId = rightDot.getAttribute('data-game-id');

  if (uiState.activeSelectedLeftDot.getAttribute('data-game-id') !== gameId) return;

  const leftIdx = uiState.activeSelectedLeftDot.getAttribute('data-left-idx');
  const svg = document.getElementById(`matching-svg-${gameId}`);
  const line = svg ? svg.querySelector(`line[data-left-idx="${leftIdx}"]`) : null;

  if (line) {
    connectDots(uiState.activeSelectedLeftDot, rightDot, line, gameId, leftIdx);
  }
}

export function connectDots(leftDot, rightDot, lineElem, gameId, leftIdx) {
  const container = document.getElementById(`matching-container-${gameId}`);
  if (!container) return;

  const cRect = container.getBoundingClientRect();
  const rRect = rightDot.getBoundingClientRect();

  const x2 = rRect.left + rRect.width / 2 - cRect.left;
  const y2 = rRect.top + rRect.height / 2 - cRect.top;

  lineElem.setAttribute('x2', x2);
  lineElem.setAttribute('y2', y2);
  lineElem.setAttribute('stroke', '#0D6EFD');

  const rightText = rightDot.getAttribute('data-right-text');
  if (!state.gameAnswers[gameId]) state.gameAnswers[gameId] = {};
  state.gameAnswers[gameId][leftIdx] = rightText;

  if (uiState.activeSelectedLeftDot) {
    uiState.activeSelectedLeftDot.classList.remove('ring-4', 'ring-amber-400');
    uiState.activeSelectedLeftDot = null;
  }
}

export function resetMatchingLines(gameId) {
  const svg = document.getElementById(`matching-svg-${gameId}`);
  if (svg) svg.innerHTML = '';
  if (state.gameAnswers[gameId]) state.gameAnswers[gameId] = {};
  showToast('info', 'Garis pasangan di-reset!');
}

export function redrawAllMatchingLines() {
  Object.keys(state.gameAnswers).forEach((gameId) => {
    const answers = state.gameAnswers[gameId];
    const container = document.getElementById(`matching-container-${gameId}`);
    const svg = document.getElementById(`matching-svg-${gameId}`);
    if (!container || !svg || !answers) return;

    svg.innerHTML = '';
    const cRect = container.getBoundingClientRect();

    Object.keys(answers).forEach((leftIdx) => {
      const rightText = answers[leftIdx];
      const leftDot = container.querySelector(`.left-dot[data-left-idx="${leftIdx}"]`);
      const rightDot = container.querySelector(`.right-dot[data-right-text="${CSS.escape(rightText)}"]`);

      if (leftDot && rightDot) {
        const lRect = leftDot.getBoundingClientRect();
        const rRect = rightDot.getBoundingClientRect();

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', lRect.left + lRect.width / 2 - cRect.left);
        line.setAttribute('y1', lRect.top + lRect.height / 2 - cRect.top);
        line.setAttribute('x2', rRect.left + rRect.width / 2 - cRect.left);
        line.setAttribute('y2', rRect.top + rRect.height / 2 - cRect.top);
        line.setAttribute('stroke', '#0D6EFD');
        line.setAttribute('stroke-width', '4');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('data-left-idx', leftIdx);
        svg.appendChild(line);
      }
    });
  });
}

window.resetMatchingLines = resetMatchingLines;
