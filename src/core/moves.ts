import { Color, PieceType, EMPTY, pieceColor, pieceType, opposite } from './pieces.ts';
import { fileOf, rankOf, onBoard, square } from './board.ts';
import { MoveFlag } from './game.ts';
import { isSquareAttacked } from './attacks.ts';

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

const ROOK_DIRS: ReadonlyArray<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_DIRS: ReadonlyArray<[number, number]> = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const QUEEN_DIRS: ReadonlyArray<[number, number]> = [...ROOK_DIRS, ...BISHOP_DIRS];

const genPawn = (
  out: Move[], from: Square, color: Color, board: Uint8Array,
): void => {
  const dir = color === Color.White ? +1 : -1;
  const startRank = color === Color.White ? 1 : 6;
  const f0 = fileOf(from), r0 = rankOf(from);

  // Single push
  const r1 = r0 + dir;
  if (onBoard(f0, r1)) {
    const to1 = square(f0, r1);
    if (board[to1]! === EMPTY) {
      out.push({ from, to: to1, flags: 0 });
      // Double push
      if (r0 === startRank) {
        const r2 = r0 + 2 * dir;
        const to2 = square(f0, r2);
        if (board[to2]! === EMPTY) {
          out.push({ from, to: to2, flags: MoveFlag.DoublePush });
        }
      }
    }
  }

  // Captures
  for (const df of [-1, +1]) {
    const f1 = f0 + df;
    if (!onBoard(f1, r1)) continue;
    const to = square(f1, r1);
    const target = board[to]!;
    if (target !== EMPTY && pieceColor(target) !== color) {
      out.push({ from, to, flags: MoveFlag.Capture });
    }
  }
};

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

const genSlider = (
  out: Move[], from: Square, color: Color, board: Uint8Array,
  dirs: ReadonlyArray<[number, number]>,
): void => {
  const f0 = fileOf(from), r0 = rankOf(from);
  for (const [df, dr] of dirs) {
    let f = f0 + df, r = r0 + dr;
    while (onBoard(f, r)) {
      const to = square(f, r);
      const target = board[to]!;
      if (target === EMPTY) {
        out.push({ from, to, flags: 0 });
      } else {
        if (pieceColor(target) !== color) {
          out.push({ from, to, flags: MoveFlag.Capture });
        }
        break;
      }
      f += df; r += dr;
    }
  }
};

export const pseudoLegalMoves = (s: GameState): Move[] => {
  const out: Move[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = s.board[sq]!;
    if (p === EMPTY || pieceColor(p) !== s.turn) continue;
    switch (pieceType(p)) {
      case PieceType.Pawn:   genPawn(out, sq, s.turn, s.board);                     break;
      case PieceType.Knight: genHopper(out, sq, s.turn, s.board, KNIGHT_OFFSETS); break;
      case PieceType.Bishop: genSlider(out, sq, s.turn, s.board, BISHOP_DIRS);    break;
      case PieceType.Rook:   genSlider(out, sq, s.turn, s.board, ROOK_DIRS);      break;
      case PieceType.Queen:  genSlider(out, sq, s.turn, s.board, QUEEN_DIRS);     break;
      case PieceType.King:   genHopper(out, sq, s.turn, s.board, KING_OFFSETS);   break;
      // Special moves — added in later tasks.
    }
  }
  return out;
};

const findKingFast = (board: Uint8Array, color: Color): Square => {
  for (let sq = 0; sq < 64; sq++) {
    const p = board[sq]!;
    if (p !== EMPTY && pieceColor(p) === color && pieceType(p) === PieceType.King) return sq;
  }
  throw new Error(`No king of color ${color}`);
};

export const legalMoves = (s: GameState): Move[] => {
  const out: Move[] = [];
  for (const m of pseudoLegalMoves(s)) {
    // Simulate on a scratch board.
    const board = new Uint8Array(s.board);
    board[m.to] = board[m.from]!;
    board[m.from] = EMPTY;
    const kingSq = findKingFast(board, s.turn);
    if (!isSquareAttacked(board, kingSq, opposite(s.turn))) out.push(m);
  }
  return out;
};
