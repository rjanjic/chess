import { Game, MoveFlag } from './game.ts';
import type { Move } from './game.ts';
import { legalMoves } from './moves.ts';
import { evaluate } from './ai-eval.ts';
import { Color, EMPTY, pieceType } from './pieces.ts';
import { status } from './rules.ts';

const MATE_SCORE = 100_000;

// Indexed by PieceType value (0-6): None, Pawn, Knight, Bishop, Rook, Queen, King
const MATERIAL = [0, 100, 320, 330, 500, 900, 0];

// MVV-LVA: prefer capturing valuable pieces with cheap attackers.
const orderMoves = (board: Uint8Array, moves: Move[]): Move[] => {
  const scored = moves.map((m) => {
    let s = 0;
    if ((m.flags & MoveFlag.Capture) !== 0) {
      const victim = MATERIAL[pieceType(board[m.to]!)] ?? 0;
      const attacker = MATERIAL[pieceType(board[m.from]!)] ?? 0;
      s = 10_000 + victim - (attacker >> 2);
    }
    if ((m.flags & MoveFlag.Promotion) !== 0) s += 5_000;
    return [s, m] as const;
  });
  scored.sort((a, b) => b[0] - a[0]);
  return scored.map(([, m]) => m);
};

// Negamax: returns score from the perspective of the side to move.
const negamax = (g: Game, depth: number, alpha: number, beta: number): number => {
  const moves = legalMoves(g.state());
  if (moves.length === 0) {
    const st = status(g);
    if (st === 'checkmate') return -MATE_SCORE + g.states.length; // prefer faster mates
    return 0; // stalemate
  }
  if (depth === 0) {
    const e = evaluate(g.state());
    return g.state().turn === Color.White ? e : -e;
  }

  let best = -Infinity;
  for (const m of orderMoves(g.state().board, moves)) {
    g.applyMove(m);
    const score = -negamax(g, depth - 1, -beta, -alpha);
    g.undo();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break; // beta cutoff
  }
  return best;
};

export const bestMove = (g: Game, depth: number): Move => {
  const moves = orderMoves(g.state().board, legalMoves(g.state()));
  if (moves.length === 0) throw new Error('No legal moves');
  let bestScore = -Infinity;
  let best: Move = moves[0]!;
  let alpha = -Infinity;
  const beta = Infinity;
  for (const m of moves) {
    g.applyMove(m);
    const score = -negamax(g, depth - 1, -beta, -alpha);
    g.undo();
    if (score > bestScore) { bestScore = score; best = m; }
    if (bestScore > alpha) alpha = bestScore;
  }
  return best;
};
