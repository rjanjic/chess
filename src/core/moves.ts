import { Color, PieceType, EMPTY, pieceColor, pieceType, opposite } from './pieces.ts';
import { fileOf, rankOf, onBoard, square } from './board.ts';
import { MoveFlag, CASTLE_WK, CASTLE_WQ, CASTLE_BK, CASTLE_BQ } from './game.ts';
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
  enPassant: Square | null,
): void => {
  const dir = color === Color.White ? +1 : -1;
  const startRank = color === Color.White ? 1 : 6;
  const f0 = fileOf(from), r0 = rankOf(from);

  // Single push (with promotion if it lands on the back rank).
  const r1 = r0 + dir;
  if (onBoard(f0, r1)) {
    const to1 = square(f0, r1);
    if (board[to1]! === EMPTY) {
      if (r1 === 0 || r1 === 7) {
        for (const promo of [PieceType.Queen, PieceType.Rook, PieceType.Bishop, PieceType.Knight]) {
          out.push({ from, to: to1, promotion: promo, flags: MoveFlag.Promotion });
        }
      } else {
        out.push({ from, to: to1, flags: 0 });
        if (r0 === startRank) {
          const r2 = r0 + 2 * dir;
          const to2 = square(f0, r2);
          if (board[to2]! === EMPTY) {
            out.push({ from, to: to2, flags: MoveFlag.DoublePush });
          }
        }
      }
    }
  }

  // Captures (with promotion if landing on the back rank).
  for (const df of [-1, +1]) {
    const f1 = f0 + df;
    if (!onBoard(f1, r1)) continue;
    const to = square(f1, r1);
    const target = board[to]!;
    if (target !== EMPTY && pieceColor(target) !== color) {
      if (r1 === 0 || r1 === 7) {
        for (const promo of [PieceType.Queen, PieceType.Rook, PieceType.Bishop, PieceType.Knight]) {
          out.push({ from, to, promotion: promo, flags: MoveFlag.Promotion | MoveFlag.Capture });
        }
      } else {
        out.push({ from, to, flags: MoveFlag.Capture });
      }
    }
  }

  // En passant: an additional diagonal capture onto the ep target square.
  if (enPassant !== null) {
    const r1 = r0 + dir;
    if (rankOf(enPassant) === r1 && Math.abs(fileOf(enPassant) - f0) === 1) {
      out.push({ from, to: enPassant, flags: MoveFlag.EnPassant | MoveFlag.Capture });
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

const genCastling = (
  out: Move[], s: GameState, kingSq: Square,
): void => {
  const color = s.turn;
  const homeRank = color === Color.White ? 0 : 7;
  if (kingSq !== square(4, homeRank)) return;

  const kSide = color === Color.White ? CASTLE_WK : CASTLE_BK;
  const qSide = color === Color.White ? CASTLE_WQ : CASTLE_BQ;
  const enemy = opposite(color);

  // King must not currently be in check.
  if (isSquareAttacked(s.board, kingSq, enemy)) return;

  // Kingside: f, g empty; f, g not attacked.
  if ((s.castling & kSide) !== 0) {
    const f1 = square(5, homeRank), g1 = square(6, homeRank);
    if (s.board[f1] === EMPTY && s.board[g1] === EMPTY
        && !isSquareAttacked(s.board, f1, enemy)
        && !isSquareAttacked(s.board, g1, enemy)) {
      out.push({ from: kingSq, to: g1, flags: MoveFlag.Castle });
    }
  }

  // Queenside: b, c, d empty; c, d not attacked.
  if ((s.castling & qSide) !== 0) {
    const b1 = square(1, homeRank), c1 = square(2, homeRank), d1 = square(3, homeRank);
    if (s.board[b1] === EMPTY && s.board[c1] === EMPTY && s.board[d1] === EMPTY
        && !isSquareAttacked(s.board, c1, enemy)
        && !isSquareAttacked(s.board, d1, enemy)) {
      out.push({ from: kingSq, to: c1, flags: MoveFlag.Castle });
    }
  }
};

export const pseudoLegalMoves = (s: GameState): Move[] => {
  const out: Move[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = s.board[sq]!;
    if (p === EMPTY || pieceColor(p) !== s.turn) continue;
    switch (pieceType(p)) {
      case PieceType.Pawn:   genPawn(out, sq, s.turn, s.board, s.enPassant); break;
      case PieceType.Knight: genHopper(out, sq, s.turn, s.board, KNIGHT_OFFSETS); break;
      case PieceType.Bishop: genSlider(out, sq, s.turn, s.board, BISHOP_DIRS);    break;
      case PieceType.Rook:   genSlider(out, sq, s.turn, s.board, ROOK_DIRS);      break;
      case PieceType.Queen:  genSlider(out, sq, s.turn, s.board, QUEEN_DIRS);     break;
      case PieceType.King:   genHopper(out, sq, s.turn, s.board, KING_OFFSETS);   break;
      // Special moves — added in later tasks.
    }
  }

  // Castling: generated once per side-to-move.
  for (let sq = 0; sq < 64; sq++) {
    const p = s.board[sq]!;
    if (p !== EMPTY && pieceColor(p) === s.turn && pieceType(p) === PieceType.King) {
      genCastling(out, s, sq);
      break;
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
    const board = new Uint8Array(s.board);
    const moving = board[m.from]!;
    board[m.to] = moving;
    board[m.from] = EMPTY;
    if ((m.flags & MoveFlag.EnPassant) !== 0) {
      const dir = pieceColor(moving) === Color.White ? -1 : +1;
      board[m.to + dir * 8] = EMPTY;
    }
    // Castle simulation: the rook hop matters only for "rook discovers a pin
    // on its own king" — castling is already gated to king-not-in-check at
    // generation time, so the basic king-square check below is sufficient.
    const kingSq = findKingFast(board, s.turn);
    if (!isSquareAttacked(board, kingSq, opposite(s.turn))) out.push(m);
  }
  return out;
};
