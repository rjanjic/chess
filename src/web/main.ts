import { Game, Color, PieceType, MoveFlag } from '../core/index.ts';
import { toFEN, legalMoves, status, sanToMove, moveToSan } from '../core/index.ts';
import { pieceColor, isEmpty } from '../core/index.ts';
import type { Square, Move } from '../core/index.ts';
import { renderBoard } from './render.ts';
import { setupInput } from './input.ts';
import { host, join, zobristHex } from './webrtc.ts';
import type { PeerConnection, PeerMessage } from './webrtc.ts';

// ── App state ─────────────────────────────────────────────────────────────────

let game = Game.newGame();
type Mode  = 'human' | 'ai-black' | 'ai-white' | 'online-host' | 'online-join';
let mode: Mode  = 'ai-black';
let aiThinking  = false;
let selectedSq: Square | null = null;
let legalTargets: Square[]    = [];

let peerConn: PeerConnection | null = null;
let myColor: Color                  = Color.White;
let pendingDrawOffer                = false;
let hostSetupAbort: AbortController | null = null;

// ── DOM references ────────────────────────────────────────────────────────────

const svgEl      = document.getElementById('board') as unknown as SVGSVGElement;
const statusEl   = document.getElementById('status')!;
const thinkingEl = document.getElementById('thinking')!;
const modeSelect = document.getElementById('mode') as HTMLSelectElement;
const promoModal = document.getElementById('promo-modal')!;

const hostSetup  = document.getElementById('host-setup')!;
const joinSetup  = document.getElementById('join-setup')!;
const manualJoin = document.getElementById('manual-join')!;
const onlineBar  = document.getElementById('online-bar')!;
const bannerEl   = document.getElementById('banner')!;
const drawPend   = document.getElementById('draw-pending')!;

const offerUrlEl  = document.getElementById('offer-url')    as HTMLInputElement;
const answerUrlEl = document.getElementById('answer-url')   as HTMLInputElement;
const answerInput = document.getElementById('answer-input') as HTMLInputElement;
const offerInput  = document.getElementById('offer-input')  as HTMLInputElement;

// ── AI worker ─────────────────────────────────────────────────────────────────

type WorkerOut = { san: string } | { error: string };
const worker = new Worker('/dist/src/web/worker.js', { type: 'module' });

// ── Derived state ─────────────────────────────────────────────────────────────

const isOnline  = (): boolean => mode === 'online-host' || mode === 'online-join';
const aiColor   = (): Color | null =>
  mode === 'ai-black' ? Color.Black : mode === 'ai-white' ? Color.White : null;
const isFlipped = (): boolean =>
  mode === 'ai-white' || (isOnline() && myColor === Color.Black);

const canInteract = (): boolean => {
  if (status(game) !== 'ongoing') return false;
  if (isOnline()) return peerConn !== null && game.state().turn === myColor;
  if (aiThinking) return false;
  const ac = aiColor();
  return ac === null || game.state().turn !== ac;
};

// ── UI helpers ────────────────────────────────────────────────────────────────

const showBanner = (msg: string): void => {
  bannerEl.textContent = msg;
  bannerEl.classList.remove('hidden');
};

const hideConnPanels = (): void => {
  hostSetup.classList.add('hidden');
  joinSetup.classList.add('hidden');
  manualJoin.classList.add('hidden');
};

// ── Render ────────────────────────────────────────────────────────────────────

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

// ── AI (offline modes only) ───────────────────────────────────────────────────

const triggerAI = (): void => {
  if (isOnline() || aiThinking) return;
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
  selectedSq = null; legalTargets = [];
  redraw();
};

// ── Promotion dialog ──────────────────────────────────────────────────────────

const promptPromotion = (): Promise<PieceType> =>
  new Promise<PieceType>((resolve) => {
    promoModal.classList.add('visible');
    const handler = (e: MouseEvent): void => {
      const btn = (e.target as HTMLElement).closest('[data-piece]') as HTMLElement | null;
      const pt  = btn !== null ? Number(btn.getAttribute('data-piece')) as PieceType : PieceType.Queen;
      promoModal.classList.remove('visible');
      promoModal.removeEventListener('click', handler);
      resolve(pt);
    };
    promoModal.addEventListener('click', handler);
  });

// ── Move execution ────────────────────────────────────────────────────────────

const doMove = async (from: Square, to: Square): Promise<void> => {
  const moves      = legalMoves(game.state());
  const promoMoves = moves.filter(m => m.from === from && m.to === to && (m.flags & MoveFlag.Promotion) !== 0);
  const plainMoves = moves.filter(m => m.from === from && m.to === to && (m.flags & MoveFlag.Promotion) === 0);

  let move: Move | undefined = plainMoves[0];
  if (promoMoves.length > 0) {
    const pt = await promptPromotion();
    move = promoMoves.find(m => m.promotion === pt);
  }
  if (!move) return;

  const san = moveToSan(game, move);
  game.applyMove(move);
  selectedSq = null; legalTargets = [];

  if (isOnline() && peerConn) {
    peerConn.send({ type: 'move', san, fenHash: zobristHex(game.state().zobrist) });
  }

  redraw();
  triggerAI();
};

// ── Peer event callbacks ──────────────────────────────────────────────────────

const onPeerOpen = (): void => {
  hideConnPanels();
  onlineBar.classList.remove('hidden');
  bannerEl.classList.add('hidden');
  redraw();
};

const onPeerClose = (): void => {
  showBanner(`Opponent disconnected. FEN: ${toFEN(game.state())}`);
  onlineBar.classList.add('hidden');
  peerConn = null;
  redraw();
};

const onPeerMessage = (msg: PeerMessage): void => {
  if (msg.type === 'move') {
    try { game.applyMove(sanToMove(game, msg.san)); }
    catch { showBanner('Invalid move received — desync detected'); return; }
    if (zobristHex(game.state().zobrist) !== msg.fenHash) {
      showBanner(`Desync detected. FEN: ${toFEN(game.state())}`);
      peerConn?.close(); peerConn = null;
      onlineBar.classList.add('hidden');
    } else {
      selectedSq = null; legalTargets = [];
      redraw();
    }
  } else if (msg.type === 'resign') {
    peerConn?.close(); peerConn = null;
    showBanner('Opponent resigned. You win!');
    onlineBar.classList.add('hidden');
  } else if (msg.type === 'draw-offer') {
    pendingDrawOffer = true;
    drawPend.classList.remove('hidden');
  } else if (msg.type === 'draw-accept') {
    peerConn?.close(); peerConn = null;
    showBanner('Draw agreed.');
    onlineBar.classList.add('hidden');
  }
};

// ── Connection flows ──────────────────────────────────────────────────────────

const startHost = async (): Promise<void> => {
  hostSetupAbort?.abort();
  hostSetupAbort = new AbortController();
  hideConnPanels();
  hostSetup.classList.remove('hidden');
  bannerEl.classList.add('hidden');
  try {
    const result = await host(location.origin, { onOpen: onPeerOpen, onClose: onPeerClose, onMessage: onPeerMessage });
    peerConn = result.peer;
    myColor  = Color.White;
    offerUrlEl.value = result.offerUrl;

    document.getElementById('btn-apply-answer')!.addEventListener('click', () => {
      const input = answerInput.value.trim();
      if (!input) return;
      result.connect(input).catch(() => showBanner('Invalid reply link — please try again.'));
    }, { once: true, signal: hostSetupAbort.signal });
  } catch (err) {
    showBanner(`Failed to create game: ${String(err)}`);
  }
};

const startJoin = async (offerRaw: string): Promise<void> => {
  hideConnPanels();
  joinSetup.classList.remove('hidden');
  bannerEl.classList.add('hidden');
  try {
    const result = await join(offerRaw, location.origin, { onOpen: onPeerOpen, onClose: onPeerClose, onMessage: onPeerMessage });
    peerConn = result.peer;
    myColor  = Color.Black;
    answerUrlEl.value = result.answerUrl;
  } catch (err) {
    showBanner(`Failed to join game: ${String(err)}`);
    hideConnPanels();
  }
};

// ── Input ─────────────────────────────────────────────────────────────────────

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
    selectedSq = null; legalTargets = [];
  }
  redraw();
});

// ── Button listeners ──────────────────────────────────────────────────────────

document.getElementById('btn-new')!.addEventListener('click', () => {
  peerConn?.close(); peerConn = null;
  hostSetupAbort?.abort(); hostSetupAbort = null;
  game = Game.newGame();
  selectedSq = null; legalTargets = []; aiThinking = false; pendingDrawOffer = false;
  hideConnPanels();
  onlineBar.classList.add('hidden');
  bannerEl.classList.add('hidden');
  drawPend.classList.add('hidden');
  redraw(); triggerAI();
});

document.getElementById('btn-undo')!.addEventListener('click', () => {
  if (isOnline()) return;
  if (game.states.length <= 1) return;
  game.undo();
  const ac = aiColor();
  if (ac !== null && game.states.length > 1 && game.state().turn === ac) game.undo();
  selectedSq = null; legalTargets = [];
  redraw(); triggerAI();
});

document.getElementById('btn-copy-offer')!.addEventListener('click', () => {
  void navigator.clipboard.writeText(offerUrlEl.value);
});

document.getElementById('btn-copy-answer')!.addEventListener('click', () => {
  void navigator.clipboard.writeText(answerUrlEl.value);
});

document.getElementById('btn-start-join')!.addEventListener('click', () => {
  const raw = offerInput.value.trim();
  if (raw) void startJoin(raw);
});

document.getElementById('btn-resign')!.addEventListener('click', () => {
  if (!peerConn) return;
  peerConn.send({ type: 'resign' });
  showBanner('You resigned.');
  onlineBar.classList.add('hidden');
  peerConn = null;
});

document.getElementById('btn-draw-offer')!.addEventListener('click', () => {
  peerConn?.send({ type: 'draw-offer' });
});

document.getElementById('btn-draw-accept')!.addEventListener('click', () => {
  if (!pendingDrawOffer || !peerConn) return;
  peerConn.send({ type: 'draw-accept' });
  pendingDrawOffer = false;
  drawPend.classList.add('hidden');
  showBanner('Draw agreed.');
  onlineBar.classList.add('hidden');
  peerConn = null;
});

document.getElementById('btn-draw-decline')!.addEventListener('click', () => {
  pendingDrawOffer = false;
  drawPend.classList.add('hidden');
});

modeSelect.addEventListener('change', () => {
  peerConn?.close(); peerConn = null;
  hostSetupAbort?.abort(); hostSetupAbort = null;
  mode = modeSelect.value as Mode;
  game = Game.newGame();
  selectedSq = null; legalTargets = []; aiThinking = false; pendingDrawOffer = false;
  hideConnPanels();
  onlineBar.classList.add('hidden');
  bannerEl.classList.add('hidden');
  drawPend.classList.add('hidden');
  if (mode === 'online-host') {
    void startHost();
  } else if (mode === 'online-join') {
    manualJoin.classList.remove('hidden');
  }
  redraw(); triggerAI();
});

// ── Auto-detect offer in URL hash ─────────────────────────────────────────────

if (location.hash.includes('offer=')) {
  modeSelect.value = 'online-join';
  mode = 'online-join';
  void startJoin(location.hash);
}

// ── Initial render ────────────────────────────────────────────────────────────

redraw();
triggerAI();
