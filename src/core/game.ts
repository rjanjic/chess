import { Color, PieceType, EMPTY, piece, pieceColor, pieceType } from './pieces.ts';
import { square } from './board.ts';
import { ZOBRIST } from './zobrist.ts';

import type { Square } from './board.ts';

export const CASTLE_WK = 1;
export const CASTLE_WQ = 2;
export const CASTLE_BK = 4;
export const CASTLE_BQ = 8;

// MoveFlag — const object pattern (instead of const enum) per project convention
export const MoveFlag = {
  None: 0,
  Capture: 1,
  Castle: 2,
  EnPassant: 4,
  DoublePush: 8,
  Promotion: 16,
} as const;
export type MoveFlag = typeof MoveFlag[keyof typeof MoveFlag];

export type Move = {
  from: Square;
  to: Square;
  promotion?: PieceType;
  flags: number;
};

export type GameState = {
  board: Uint8Array;            // 64 squares
  turn: Color;
  castling: number;             // 4-bit mask
  enPassant: Square | null;
  halfmoveClock: number;
  fullmoveNumber: number;
  zobrist: bigint;
};

const computeZobrist = (s: Omit<GameState, 'zobrist'>): bigint => {
  let h = 0n;
  for (let sq = 0; sq < 64; sq++) {
    const p = s.board[sq]!;
    if (p !== EMPTY) h ^= ZOBRIST.pieces[p]![sq]!;
  }
  if (s.turn === Color.Black) h ^= ZOBRIST.side;
  h ^= ZOBRIST.castling[s.castling]!;
  if (s.enPassant !== null) h ^= ZOBRIST.epFile[s.enPassant & 7]!;
  return h;
};

const buildInitialBoard = (): Uint8Array => {
  const b = new Uint8Array(64);
  const backRank: PieceType[] = [
    PieceType.Rook, PieceType.Knight, PieceType.Bishop, PieceType.Queen,
    PieceType.King, PieceType.Bishop, PieceType.Knight, PieceType.Rook,
  ];
  for (let f = 0; f < 8; f++) {
    b[square(f, 0)] = piece(backRank[f]!, Color.White);
    b[square(f, 1)] = piece(PieceType.Pawn, Color.White);
    b[square(f, 6)] = piece(PieceType.Pawn, Color.Black);
    b[square(f, 7)] = piece(backRank[f]!, Color.Black);
  }
  return b;
};

export class Game {
  readonly states: GameState[];
  readonly moves: Move[];

  private constructor(initial: GameState) {
    this.states = [initial];
    this.moves = [];
  }

  static newGame(): Game {
    const partial = {
      board: buildInitialBoard(),
      turn: Color.White,
      castling: CASTLE_WK | CASTLE_WQ | CASTLE_BK | CASTLE_BQ,
      enPassant: null as Square | null,
      halfmoveClock: 0,
      fullmoveNumber: 1,
    };
    const initial: GameState = { ...partial, zobrist: computeZobrist(partial) };
    return new Game(initial);
  }

  static fromState(s: GameState): Game {
    return new Game(s);
  }

  state(): GameState {
    return this.states[this.states.length - 1]!;
  }
}

export { computeZobrist };
