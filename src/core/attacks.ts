import { Color, PieceType, EMPTY, pieceColor, pieceType, opposite } from './pieces.ts';
import { fileOf, rankOf, onBoard, square } from './board.ts';

import type { Square } from './board.ts';
import type { GameState } from './game.ts';

const KNIGHT_OFFSETS: ReadonlyArray<[number, number]> = [
  [+1, +2], [+2, +1], [+2, -1], [+1, -2],
  [-1, -2], [-2, -1], [-2, +1], [-1, +2],
];

const KING_OFFSETS: ReadonlyArray<[number, number]> = [
  [-1, -1], [0, -1], [+1, -1],
  [-1,  0],          [+1,  0],
  [-1, +1], [0, +1], [+1, +1],
];

const ROOK_DIRS:   ReadonlyArray<[number, number]> = [[ 1, 0], [-1, 0], [0,  1], [ 0, -1]];
const BISHOP_DIRS: ReadonlyArray<[number, number]> = [[ 1, 1], [ 1,-1], [-1, 1], [-1, -1]];

export const isSquareAttacked = (
  board: Uint8Array, target: Square, byColor: Color,
): boolean => {
  const tf = fileOf(target), tr = rankOf(target);

  // Pawn attacks (run "backwards" from the target's perspective).
  const pawnDir = byColor === Color.White ? -1 : +1;
  for (const df of [-1, +1]) {
    const f = tf + df, r = tr + pawnDir;
    if (!onBoard(f, r)) continue;
    const p = board[square(f, r)]!;
    if (p !== EMPTY && pieceColor(p) === byColor && pieceType(p) === PieceType.Pawn) return true;
  }

  // Knight attacks.
  for (const [df, dr] of KNIGHT_OFFSETS) {
    const f = tf + df, r = tr + dr;
    if (!onBoard(f, r)) continue;
    const p = board[square(f, r)]!;
    if (p !== EMPTY && pieceColor(p) === byColor && pieceType(p) === PieceType.Knight) return true;
  }

  // King attacks (used for adjacent-king detection).
  for (const [df, dr] of KING_OFFSETS) {
    const f = tf + df, r = tr + dr;
    if (!onBoard(f, r)) continue;
    const p = board[square(f, r)]!;
    if (p !== EMPTY && pieceColor(p) === byColor && pieceType(p) === PieceType.King) return true;
  }

  // Sliding attacks: rook/queen along ranks/files; bishop/queen along diagonals.
  const scan = (
    dirs: ReadonlyArray<[number, number]>,
    sliders: ReadonlyArray<PieceType>,
  ): boolean => {
    for (const [df, dr] of dirs) {
      let f = tf + df, r = tr + dr;
      while (onBoard(f, r)) {
        const p = board[square(f, r)]!;
        if (p !== EMPTY) {
          if (pieceColor(p) === byColor && sliders.includes(pieceType(p))) return true;
          break;
        }
        f += df; r += dr;
      }
    }
    return false;
  };
  if (scan(ROOK_DIRS,   [PieceType.Rook,   PieceType.Queen])) return true;
  if (scan(BISHOP_DIRS, [PieceType.Bishop, PieceType.Queen])) return true;

  return false;
};

const findKing = (board: Uint8Array, color: Color): Square => {
  for (let sq = 0; sq < 64; sq++) {
    const p = board[sq]!;
    if (p !== EMPTY && pieceColor(p) === color && pieceType(p) === PieceType.King) return sq;
  }
  throw new Error(`No king of color ${color} on board`);
};

export const isInCheck = (s: GameState): boolean =>
  isSquareAttacked(s.board, findKing(s.board, s.turn), opposite(s.turn));
