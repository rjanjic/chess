import { Color, PieceType, EMPTY, piece, pieceColor, pieceType, opposite } from './pieces.ts';
import { square, fileOf, rankOf } from './board.ts';
import type { Square } from './board.ts';
import { ZOBRIST } from './zobrist.ts';

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

// When the piece on these squares moves or is captured, the listed castling
// bits are revoked. Default 0b1111 = no change.
const CASTLE_MASK_ON_FROM_OR_TO = (() => {
  const m = new Uint8Array(64).fill(0b1111);
  m[square(0, 0)] = 0b1111 & ~CASTLE_WQ; // a1
  m[square(4, 0)] = 0b1111 & ~(CASTLE_WK | CASTLE_WQ); // e1
  m[square(7, 0)] = 0b1111 & ~CASTLE_WK; // h1
  m[square(0, 7)] = 0b1111 & ~CASTLE_BQ; // a8
  m[square(4, 7)] = 0b1111 & ~(CASTLE_BK | CASTLE_BQ); // e8
  m[square(7, 7)] = 0b1111 & ~CASTLE_BK; // h8
  return m;
})();

export class Game {
  states: GameState[];
  moves: Move[];

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

  applyMove(m: Move): void {
    const prev = this.state();
    const board = new Uint8Array(prev.board);
    const moving = board[m.from]!;
    const movingType = pieceType(moving);
    const captured = board[m.to]!;

    // Board mutation (basic move; special-move side-effects layered later).
    board[m.from] = EMPTY;
    board[m.to] = moving;

    // Castle: also move the rook.
    if ((m.flags & MoveFlag.Castle) !== 0) {
      const rank = rankOf(m.from);
      if (fileOf(m.to) === 6) {
        // Kingside: rook h-file -> f-file
        board[square(5, rank)] = board[square(7, rank)]!;
        board[square(7, rank)] = EMPTY;
      } else {
        // Queenside: rook a-file -> d-file
        board[square(3, rank)] = board[square(0, rank)]!;
        board[square(0, rank)] = EMPTY;
      }
    }

    // Castling rights: revoke based on from/to squares.
    const castling = prev.castling
      & CASTLE_MASK_ON_FROM_OR_TO[m.from]!
      & CASTLE_MASK_ON_FROM_OR_TO[m.to]!;

    // En passant: set only after a pawn double-push.
    let enPassant: Square | null = null;
    if ((m.flags & MoveFlag.DoublePush) !== 0) {
      enPassant = (m.from + m.to) >> 1; // square between from and to
    }

    // Clocks.
    const halfmoveClock = (movingType === PieceType.Pawn || captured !== EMPTY)
      ? 0 : prev.halfmoveClock + 1;
    const fullmoveNumber = prev.turn === Color.Black
      ? prev.fullmoveNumber + 1 : prev.fullmoveNumber;

    const next: GameState = {
      board, turn: opposite(prev.turn),
      castling, enPassant, halfmoveClock, fullmoveNumber,
      zobrist: 0n, // filled below
    };
    next.zobrist = computeZobrist(next);
    this.states.push(next);
    this.moves.push(m);
  }

  undo(): void {
    if (this.states.length <= 1) throw new Error('Nothing to undo');
    this.states.pop();
    this.moves.pop();
  }
}

export { computeZobrist };
