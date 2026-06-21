import { Game } from './game.ts';
import { legalMoves } from './moves.ts';
import { isInCheck } from './attacks.ts';

import type { GameState } from './game.ts';

export type GameStatus =
  | 'ongoing'
  | 'checkmate'
  | 'stalemate'
  | 'draw-50'
  | 'draw-repetition'
  | 'draw-material';

export const status = (game: Game): GameStatus => {
  const s = game.state();
  if (legalMoves(s).length === 0) {
    return isInCheck(s) ? 'checkmate' : 'stalemate';
  }
  return 'ongoing'; // draw conditions added in Task 15
};
