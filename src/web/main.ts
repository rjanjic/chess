import { Game, Color, PieceType, MoveFlag } from '../core/index.ts';
import { toFEN, legalMoves, status, sanToMove } from '../core/index.ts';
import { pieceColor, isEmpty } from '../core/index.ts';
import type { Square } from '../core/index.ts';
import { renderBoard } from './render.ts';
import { setupInput } from './input.ts';

let game = Game.newGame();
type Mode = 'human' | 'ai-black' | 'ai-white';
let mode: Mode = 'ai-black';
let aiThinking = false;
let selectedSq: Square | null = null;
let legalTargets: Square[] = [];

const svgEl      = document.getElementById('board') as unknown as SVGSVGElement;
const statusEl   = document.getElementById('status')!;
const thinkingEl = document.getElementById('thinking')!;
const modeSelect = document.getElementById('mode') as HTMLSelectElement;
const promoModal = document.getElementById('promo-modal')!;

type WorkerOut = { san: string } | { error: string };
const worker = new Worker('/dist/src/web/worker.js', { type: 'module' });

const isFlipped = (): boolean => mode === 'ai-white';
const aiColor   = (): Color | null =>
  mode === 'ai-black' ? Color.Black : mode === 'ai-white' ? Color.White : null;

const canInteract = (): boolean => {
  if (aiThinking) return false;
  if (status(game) !== 'ongoing') return false;
  const ac = aiColor();
  return ac === null || game.state().turn !== ac;
};

const redraw = (): void => {
  renderBoard(svgEl, game.state(), selectedSq, legalTargets, isFlipped());
  const s    = status(game);
  const turn = game.state().turn;
  statusEl.textContent =
    s === 'ongoing'   ? `${turn === Color.White ? 'White' : 'Black'} to move` :
    s === 'checkmate' ? `Checkmate — ${turn === Color.White ? 'Black' : 'White'} wins` :
    s === 'stalemate' ? 'Stalemate — draw' : 'Draw';
  thinkingEl.textContent = aiThinking ? 'AI is thinking…' : '';
};

const triggerAI = (): void => {
  if (aiThinking) return;
  const ac = aiColor();
  if (ac === null || status(game) !== 'ongoing' || game.state().turn !== ac) return;
  aiThinking = true;
  redraw();
  worker.postMessage({ fen: toFEN(game.state()), depth: 4 });
};

worker.onmessage = (e: MessageEvent<WorkerOut>): void => {
  aiThinking = false;
  if ('error' in e.data) { console.error('AI error:', e.data.error); redraw(); return; }
  try { game.applyMove(sanToMove(game, e.data.san)); }
  catch (err) { console.error('Failed to apply AI move:', err); }
  selectedSq = null;
  legalTargets = [];
  redraw();
};

const promptPromotion = (): Promise<PieceType> =>
  new Promise<PieceType>((resolve) => {
    promoModal.classList.add('visible');
    const handler = (e: MouseEvent): void => {
      const btn = (e.target as HTMLElement).closest('[data-piece]') as HTMLElement | null;
      const pt = btn !== null ? Number(btn.getAttribute('data-piece')) as PieceType : PieceType.Queen;
      promoModal.classList.remove('visible');
      promoModal.removeEventListener('click', handler);
      resolve(pt);
    };
    promoModal.addEventListener('click', handler);
  });

const doMove = async (from: Square, to: Square): Promise<void> => {
  const moves      = legalMoves(game.state());
  const promoMoves = moves.filter(m => m.from === from && m.to === to && (m.flags & MoveFlag.Promotion) !== 0);
  const plainMoves = moves.filter(m => m.from === from && m.to === to && (m.flags & MoveFlag.Promotion) === 0);

  let move: import('../core/index.ts').Move | undefined = plainMoves[0];
  if (promoMoves.length > 0) {
    const pt = await promptPromotion();
    move = promoMoves.find(m => m.promotion === pt);
  }
  if (!move) return;

  game.applyMove(move);
  selectedSq = null;
  legalTargets = [];
  redraw();
  triggerAI();
};

setupInput(svgEl, isFlipped, (sq) => {
  if (!canInteract()) return;
  const st = game.state();

  if (selectedSq !== null && legalTargets.includes(sq)) {
    void doMove(selectedSq, sq);
    return;
  }

  const p = st.board[sq]!;
  if (!isEmpty(p) && pieceColor(p) === st.turn) {
    selectedSq   = sq;
    legalTargets = [...new Set(legalMoves(st).filter(m => m.from === sq).map(m => m.to))];
  } else {
    selectedSq   = null;
    legalTargets = [];
  }
  redraw();
});

document.getElementById('btn-new')!.addEventListener('click', () => {
  game = Game.newGame();
  selectedSq = null; legalTargets = []; aiThinking = false;
  redraw();
  triggerAI();
});

document.getElementById('btn-undo')!.addEventListener('click', () => {
  if (game.states.length <= 1) return;
  game.undo();
  const ac = aiColor();
  if (ac !== null && game.states.length > 1 && game.state().turn === ac) game.undo();
  selectedSq = null; legalTargets = [];
  redraw();
  triggerAI();
});

modeSelect.addEventListener('change', () => {
  mode = modeSelect.value as Mode;
  game = Game.newGame();
  selectedSq = null; legalTargets = []; aiThinking = false;
  redraw();
  triggerAI();
});

redraw();
triggerAI();
