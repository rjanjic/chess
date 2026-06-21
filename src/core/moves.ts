import { Color, PieceType, EMPTY, pieceColor, pieceType } from './pieces.ts';
import { fileOf, rankOf, onBoard, square } from './board.ts';
import { MoveFlag } from './game.ts';

import type { Square } from './board.ts';
import type { GameState, Move } from './game.ts';

const KNIGHT_OFFSETS: ReadonlyArray<[number, number]> = [
  [+1, +2], [+2, +1], [+2, -1], [+1, -2],
  [-1, -2], [-2, -1], [-2, +1], [-1, +2],
];

const KING_OFFSETS: ReadonlyArray<[number, number]> = [
  [-1, -1], [0, -1], [+1, -1],
  [-1,  0],          [+1,  0],
  [-1, +1], [0, +1], [+1, +1],
];

const pushMove = (
  out: Move[], from: Square, to: Square, board: Uint8Array, extra = 0,
): void => {
  const captured = board[to]!;
  const flags = extra | (captured !== EMPTY ? MoveFlag.Capture : 0);
  out.push({ from, to, flags });
};

const genHopper = (
  out: Move[], from: Square, color: Color, board: Uint8Array,
  offsets: ReadonlyArray<[number, number]>,
): void => {
  const f0 = fileOf(from), r0 = rankOf(from);
  for (const [df, dr] of offsets) {
    const f = f0 + df, r = r0 + dr;
    if (!onBoard(f, r)) continue;
    const to = square(f, r);
    const target = board[to]!;
    if (target !== EMPTY && pieceColor(target) === color) continue;
    pushMove(out, from, to, board);
  }
};

export const pseudoLegalMoves = (s: GameState): Move[] => {
  const out: Move[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = s.board[sq]!;
    if (p === EMPTY || pieceColor(p) !== s.turn) continue;
    switch (pieceType(p)) {
      case PieceType.Knight: genHopper(out, sq, s.turn, s.board, KNIGHT_OFFSETS); break;
      case PieceType.King:   genHopper(out, sq, s.turn, s.board, KING_OFFSETS);   break;
      // Pawn, sliding pieces, special moves — added in later tasks.
    }
  }
  return out;
};
