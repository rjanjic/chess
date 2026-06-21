import { Game } from './game.ts';
import type { GameState } from './game.ts';
import { legalMoves } from './moves.ts';
import { isInCheck } from './attacks.ts';
import { Color, PieceType, EMPTY, pieceColor, pieceType } from './pieces.ts';
import { fileOf, rankOf } from './board.ts';

export type GameStatus =
  | 'ongoing'
  | 'checkmate'
  | 'stalemate'
  | 'draw-50'
  | 'draw-repetition'
  | 'draw-material';

const isInsufficientMaterial = (s: GameState): boolean => {
  // Collect non-king pieces per side along with bishop square colors.
  const w = { bishops: [] as number[], knights: 0, others: 0 };
  const b = { bishops: [] as number[], knights: 0, others: 0 };

  for (let sq = 0; sq < 64; sq++) {
    const p = s.board[sq]!;
    if (p === EMPTY) continue;
    const t = pieceType(p);
    if (t === PieceType.King) continue;
    const c = pieceColor(p);
    const side = c === Color.White ? w : b;
    if (t === PieceType.Bishop) side.bishops.push((fileOf(sq) + rankOf(sq)) & 1);
    else if (t === PieceType.Knight) side.knights += 1;
    else side.others += 1;
  }

  // Any pawn, rook, or queen → sufficient material.
  if (w.others > 0 || b.others > 0) return false;

  const wMinors = w.bishops.length + w.knights;
  const bMinors = b.bishops.length + b.knights;

  // K vs K
  if (wMinors === 0 && bMinors === 0) return true;
  // K+B vs K, K+N vs K (either side)
  if (wMinors === 1 && bMinors === 0) return true;
  if (wMinors === 0 && bMinors === 1) return true;
  // K+B vs K+B with bishops on the same color
  if (wMinors === 1 && bMinors === 1
      && w.bishops.length === 1 && b.bishops.length === 1
      && w.bishops[0] === b.bishops[0]) return true;

  return false;
};

const isThreefoldRepetition = (game: Game): boolean => {
  const current = game.state().zobrist;
  let count = 0;
  for (const s of game.states) {
    if (s.zobrist === current) count += 1;
    if (count >= 3) return true;
  }
  return false;
};

export const status = (game: Game): GameStatus => {
  const s = game.state();
  if (legalMoves(s).length === 0) {
    return isInCheck(s) ? 'checkmate' : 'stalemate';
  }
  if (isInsufficientMaterial(s)) return 'draw-material';
  if (s.halfmoveClock >= 100) return 'draw-50';
  if (isThreefoldRepetition(game)) return 'draw-repetition';
  return 'ongoing';
};
