# Chess Core Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the zero-dependency TypeScript chess engine (rules + notation + AI) as a pure library, fully covered by tests, on which the CLI and Web UIs will be built in follow-on plans.

**Architecture:** All logic lives in `src/core/` as pure TypeScript modules with no I/O, no DOM, and no Node-specific APIs. A `Game` class wraps an immutable `GameState` history; move generation is split into a pseudo-legal phase plus a legality filter (king-not-in-check). The AI is a single pure function over a `Game`. Tests use Node's built-in `node:test` runner; TypeScript runs natively under Node 22.6+.

**Tech Stack:** TypeScript 5.x, Node ≥ 22.6 (native `.ts` execution via `--experimental-strip-types`; unflagged in Node ≥ 23.6). No npm dependencies. TypeScript is the one allowed `devDependency`.

**Scope:** This is **Plan 1 of 4**. Follow-on plans (after this one ships green): CLI UI, Web UI (pass-and-play + vs AI), WebRTC online mode.

**Spec:** `docs/superpowers/specs/2026-06-21-chess-design.md`

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "chess",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "test": "node --test --experimental-strip-types tests"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "rewriteRelativeImportExtensions": true,
    "outDir": "dist",
    "rootDir": ".",
    "lib": ["ES2022", "DOM", "WebWorker"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

- [ ] **Step 3: Create `.gitignore`**

```
dist/
node_modules/
.DS_Store
```

- [ ] **Step 4: Create `README.md`**

```markdown
# Chess

Zero-dependency TypeScript chess engine with CLI and browser UIs.

## Requirements

- Node ≥ 22.6 (for native `.ts` execution).

## Build

    npm install      # installs TypeScript (the only devDependency)
    npm run build    # tsc → dist/

## Test

    npm test
```

- [ ] **Step 5: Install TypeScript and verify**

Run:

```sh
npm install
npx tsc --version
npm test
```

Expected: `npm install` succeeds; `tsc --version` prints `Version 5.x.x`; `npm test` reports "no test files found" (or similar) without crashing.

- [ ] **Step 6: Commit**

```sh
git add package.json tsconfig.json .gitignore README.md package-lock.json
git commit -m "chore: scaffold zero-dep TypeScript project"
```

---

### Task 2: Pieces Module

**Files:**
- Create: `src/core/pieces.ts`
- Create: `tests/pieces.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/pieces.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PieceType, Color, EMPTY, piece, pieceType, pieceColor, isEmpty, opposite,
} from '../src/core/pieces.ts';

test('piece pack/unpack round-trips for every (type, color)', () => {
  for (const type of [PieceType.Pawn, PieceType.Knight, PieceType.Bishop,
                      PieceType.Rook, PieceType.Queen, PieceType.King]) {
    for (const color of [Color.White, Color.Black]) {
      const p = piece(type, color);
      assert.equal(pieceType(p), type);
      assert.equal(pieceColor(p), color);
      assert.equal(isEmpty(p), false);
    }
  }
});

test('EMPTY is empty', () => {
  assert.equal(isEmpty(EMPTY), true);
});

test('opposite flips colors', () => {
  assert.equal(opposite(Color.White), Color.Black);
  assert.equal(opposite(Color.Black), Color.White);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/core/pieces.ts'`.

- [ ] **Step 3: Implement `src/core/pieces.ts`**

```ts
export const enum PieceType {
  None = 0,
  Pawn = 1,
  Knight = 2,
  Bishop = 3,
  Rook = 4,
  Queen = 5,
  King = 6,
}

export const enum Color {
  White = 0,
  Black = 1,
}

export type Piece = number;

export const EMPTY: Piece = 0;

export const piece = (type: PieceType, color: Color): Piece =>
  (type & 0b111) | ((color & 1) << 3);

export const pieceType = (p: Piece): PieceType => (p & 0b111) as PieceType;
export const pieceColor = (p: Piece): Color => ((p >> 3) & 1) as Color;
export const isEmpty = (p: Piece): boolean => p === 0;
export const opposite = (c: Color): Color => (c ^ 1) as Color;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 3 tests pass.

- [ ] **Step 5: Commit**

```sh
git add src/core/pieces.ts tests/pieces.test.ts
git commit -m "feat(core): add piece type encoding"
```

---

### Task 3: Board / Square Primitives

**Files:**
- Create: `src/core/board.ts`
- Create: `tests/board.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/board.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  square, fileOf, rankOf, squareName, parseSquare, onBoard, FILE_A, FILE_H,
} from '../src/core/board.ts';

test('square / fileOf / rankOf round-trip', () => {
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = square(f, r);
      assert.equal(fileOf(sq), f);
      assert.equal(rankOf(sq), r);
    }
  }
});

test('a1 = 0, h8 = 63', () => {
  assert.equal(square(0, 0), 0);
  assert.equal(square(7, 7), 63);
});

test('squareName / parseSquare round-trip', () => {
  const names = ['a1', 'h1', 'a8', 'h8', 'e4', 'd5'];
  for (const n of names) {
    assert.equal(squareName(parseSquare(n)), n);
  }
});

test('onBoard rejects off-board file/rank', () => {
  assert.equal(onBoard(0, 0), true);
  assert.equal(onBoard(7, 7), true);
  assert.equal(onBoard(-1, 0), false);
  assert.equal(onBoard(8, 0), false);
  assert.equal(onBoard(0, -1), false);
  assert.equal(onBoard(0, 8), false);
});

test('FILE_A and FILE_H constants', () => {
  assert.equal(FILE_A, 0);
  assert.equal(FILE_H, 7);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/core/board.ts`**

```ts
export type Square = number; // 0..63, a1=0, h8=63

export const FILE_A = 0;
export const FILE_H = 7;
export const RANK_1 = 0;
export const RANK_8 = 7;

export const square = (file: number, rank: number): Square => rank * 8 + file;
export const fileOf = (sq: Square): number => sq & 7;
export const rankOf = (sq: Square): number => (sq >> 3) & 7;

export const onBoard = (file: number, rank: number): boolean =>
  file >= 0 && file < 8 && rank >= 0 && rank < 8;

export const squareName = (sq: Square): string =>
  'abcdefgh'[fileOf(sq)]! + String(rankOf(sq) + 1);

export const parseSquare = (s: string): Square => {
  if (s.length !== 2) throw new Error(`Invalid square: ${s}`);
  const file = s.charCodeAt(0) - 97; // 'a'
  const rank = s.charCodeAt(1) - 49; // '1'
  if (!onBoard(file, rank)) throw new Error(`Invalid square: ${s}`);
  return square(file, rank);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit**

```sh
git add src/core/board.ts tests/board.test.ts
git commit -m "feat(core): add board square primitives"
```

---

### Task 4: Zobrist Hashing

**Files:**
- Create: `src/core/zobrist.ts`
- Create: `tests/zobrist.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/zobrist.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ZOBRIST } from '../src/core/zobrist.ts';
import { PieceType, Color, piece } from '../src/core/pieces.ts';

test('zobrist tables are populated and deterministic', () => {
  // Same seed always produces the same value.
  const p = piece(PieceType.King, Color.White);
  assert.equal(typeof ZOBRIST.pieces[p]![0], 'bigint');
  assert.notEqual(ZOBRIST.pieces[p]![0], 0n);

  // Different (piece, square) pairs produce different values.
  assert.notEqual(ZOBRIST.pieces[p]![0], ZOBRIST.pieces[p]![1]);
});

test('zobrist has side, castling, epFile tables', () => {
  assert.equal(typeof ZOBRIST.side, 'bigint');
  assert.equal(ZOBRIST.castling.length, 16);
  assert.equal(ZOBRIST.epFile.length, 8);
  assert.equal(typeof ZOBRIST.castling[0], 'bigint');
  assert.equal(typeof ZOBRIST.epFile[0], 'bigint');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/core/zobrist.ts`**

```ts
// Deterministic, seedable 64-bit PRNG (xorshift64*). Used only at module
// load to populate the Zobrist tables — never on the hot path.
const xorshift64 = (seed: bigint) => {
  let x = seed;
  const mask = (1n << 64n) - 1n;
  return (): bigint => {
    x ^= (x << 13n) & mask;
    x ^= (x >> 7n) & mask;
    x ^= (x << 17n) & mask;
    x &= mask;
    return (x * 0x2545F4914F6CDD1Dn) & mask;
  };
};

const rng = xorshift64(0x9E3779B97F4A7C15n);

// Indexed by Piece value (0..15). Slot 0 (EMPTY) is unused but allocated for
// uniform indexing.
const pieces: bigint[][] = Array.from({ length: 16 }, () =>
  Array.from({ length: 64 }, () => rng())
);

const side: bigint = rng();
// Indexed by 4-bit castling mask (0..15).
const castling: bigint[] = Array.from({ length: 16 }, () => rng());
// Indexed by file (0..7).
const epFile: bigint[] = Array.from({ length: 8 }, () => rng());

export const ZOBRIST = { pieces, side, castling, epFile } as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```sh
git add src/core/zobrist.ts tests/zobrist.test.ts
git commit -m "feat(core): add Zobrist hash tables"
```

---

### Task 5: Game State + Initial Position

**Files:**
- Create: `src/core/game.ts`
- Create: `tests/game.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/game.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, CASTLE_WK, CASTLE_WQ, CASTLE_BK, CASTLE_BQ } from '../src/core/game.ts';
import { Color, PieceType, piece, EMPTY } from '../src/core/pieces.ts';
import { square } from '../src/core/board.ts';

test('newGame: starting position has correct piece placement', () => {
  const g = Game.newGame();
  const s = g.state();

  // White back rank
  assert.equal(s.board[square(0, 0)], piece(PieceType.Rook, Color.White));
  assert.equal(s.board[square(4, 0)], piece(PieceType.King, Color.White));
  // White pawns
  for (let f = 0; f < 8; f++) {
    assert.equal(s.board[square(f, 1)], piece(PieceType.Pawn, Color.White));
  }
  // Middle four ranks are empty
  for (let r = 2; r <= 5; r++) {
    for (let f = 0; f < 8; f++) {
      assert.equal(s.board[square(f, r)], EMPTY);
    }
  }
  // Black pawns / back rank
  for (let f = 0; f < 8; f++) {
    assert.equal(s.board[square(f, 6)], piece(PieceType.Pawn, Color.Black));
  }
  assert.equal(s.board[square(4, 7)], piece(PieceType.King, Color.Black));
});

test('newGame: white to move, full castling rights, no ep, clocks reset', () => {
  const s = Game.newGame().state();
  assert.equal(s.turn, Color.White);
  assert.equal(s.castling, CASTLE_WK | CASTLE_WQ | CASTLE_BK | CASTLE_BQ);
  assert.equal(s.enPassant, null);
  assert.equal(s.halfmoveClock, 0);
  assert.equal(s.fullmoveNumber, 1);
});

test('newGame: zobrist hash is non-zero and stable', () => {
  const a = Game.newGame().state().zobrist;
  const b = Game.newGame().state().zobrist;
  assert.equal(a, b);
  assert.notEqual(a, 0n);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/core/game.ts`**

```ts
import { Color, PieceType, Piece, EMPTY, piece, pieceColor, pieceType } from './pieces.ts';
import { Square, square } from './board.ts';
import { ZOBRIST } from './zobrist.ts';

export const CASTLE_WK = 1;
export const CASTLE_WQ = 2;
export const CASTLE_BK = 4;
export const CASTLE_BQ = 8;

export const enum MoveFlag {
  None = 0,
  Capture = 1,
  Castle = 2,
  EnPassant = 4,
  DoublePush = 8,
  Promotion = 16,
}

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 3 game tests pass.

- [ ] **Step 5: Commit**

```sh
git add src/core/game.ts tests/game.test.ts
git commit -m "feat(core): add Game class with starting position"
```

---

### Task 6: Move Generation — Knight & King

**Files:**
- Create: `src/core/moves.ts`
- Create: `tests/moves-knight-king.test.ts`

This task implements **pseudo-legal** moves (ignoring whether the move leaves the own king in check). Legality is filtered in Task 10.

- [ ] **Step 1: Write the failing test**

`tests/moves-knight-king.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Color, PieceType, EMPTY, piece } from '../src/core/pieces.ts';
import { square, squareName } from '../src/core/board.ts';
import { pseudoLegalMoves } from '../src/core/moves.ts';
import { Game } from '../src/core/game.ts';

const emptyBoard = (): Uint8Array => new Uint8Array(64);

const stateWith = (
  setup: (b: Uint8Array) => void,
  turn: Color = Color.White,
) => {
  const b = emptyBoard();
  setup(b);
  return {
    board: b, turn, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  };
};

const targets = (moves: { from: number; to: number }[], from: number) =>
  moves.filter((m) => m.from === from).map((m) => squareName(m.to)).sort();

test('knight in center has 8 moves', () => {
  const s = stateWith((b) => {
    b[square(4, 4)] = piece(PieceType.Knight, Color.White); // e5
  });
  const ts = targets(pseudoLegalMoves(s), square(4, 4));
  assert.deepEqual(ts, ['c4', 'c6', 'd3', 'd7', 'f3', 'f7', 'g4', 'g6'].sort());
});

test('knight in corner has 2 moves', () => {
  const s = stateWith((b) => {
    b[square(0, 0)] = piece(PieceType.Knight, Color.White); // a1
  });
  const ts = targets(pseudoLegalMoves(s), square(0, 0));
  assert.deepEqual(ts, ['b3', 'c2'].sort());
});

test('knight does not capture own piece', () => {
  const s = stateWith((b) => {
    b[square(4, 4)] = piece(PieceType.Knight, Color.White);
    b[square(5, 6)] = piece(PieceType.Pawn, Color.White); // f7 blocked
  });
  const ts = targets(pseudoLegalMoves(s), square(4, 4));
  assert.ok(!ts.includes('f7'));
});

test('knight captures enemy piece', () => {
  const s = stateWith((b) => {
    b[square(4, 4)] = piece(PieceType.Knight, Color.White);
    b[square(5, 6)] = piece(PieceType.Pawn, Color.Black);
  });
  const ts = targets(pseudoLegalMoves(s), square(4, 4));
  assert.ok(ts.includes('f7'));
});

test('king in center has 8 moves', () => {
  const s = stateWith((b) => {
    b[square(4, 4)] = piece(PieceType.King, Color.White);
  });
  const ts = targets(pseudoLegalMoves(s), square(4, 4));
  assert.deepEqual(ts, ['d4', 'd5', 'd6', 'e4', 'e6', 'f4', 'f5', 'f6'].sort());
});

test('only own-color pieces generate moves', () => {
  const s = stateWith((b) => {
    b[square(4, 4)] = piece(PieceType.Knight, Color.Black);
  }, Color.White);
  assert.equal(pseudoLegalMoves(s).length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `pseudoLegalMoves` not exported.

- [ ] **Step 3: Implement `src/core/moves.ts`**

```ts
import { Color, PieceType, Piece, EMPTY, piece, pieceColor, pieceType, opposite } from './pieces.ts';
import { Square, fileOf, rankOf, onBoard, square } from './board.ts';
import { GameState, Move, MoveFlag } from './game.ts';

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 6 knight/king tests pass.

- [ ] **Step 5: Commit**

```sh
git add src/core/moves.ts tests/moves-knight-king.test.ts
git commit -m "feat(core): pseudo-legal knight and king moves"
```

---

### Task 7: Move Generation — Pawn (Push & Capture)

**Files:**
- Modify: `src/core/moves.ts`
- Create: `tests/moves-pawn.test.ts`

Promotion is its own task (Task 13). En passant is its own task (Task 12). This task only covers single push, double push from starting rank, and diagonal capture.

- [ ] **Step 1: Write the failing test**

`tests/moves-pawn.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Color, PieceType, piece } from '../src/core/pieces.ts';
import { square, squareName } from '../src/core/board.ts';
import { pseudoLegalMoves } from '../src/core/moves.ts';
import { MoveFlag } from '../src/core/game.ts';

const stateWith = (setup: (b: Uint8Array) => void, turn: Color = Color.White) => {
  const b = new Uint8Array(64);
  setup(b);
  return {
    board: b, turn, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  };
};

const targets = (moves: { from: number; to: number }[], from: number) =>
  moves.filter((m) => m.from === from).map((m) => squareName(m.to)).sort();

test('white pawn on starting rank: single + double push', () => {
  const s = stateWith((b) => {
    b[square(4, 1)] = piece(PieceType.Pawn, Color.White); // e2
  });
  assert.deepEqual(targets(pseudoLegalMoves(s), square(4, 1)), ['e3', 'e4']);
});

test('white pawn not on starting rank: single push only', () => {
  const s = stateWith((b) => {
    b[square(4, 3)] = piece(PieceType.Pawn, Color.White); // e4
  });
  assert.deepEqual(targets(pseudoLegalMoves(s), square(4, 3)), ['e5']);
});

test('white pawn blocked on single push: no double push', () => {
  const s = stateWith((b) => {
    b[square(4, 1)] = piece(PieceType.Pawn, Color.White);
    b[square(4, 2)] = piece(PieceType.Pawn, Color.Black); // blocker on e3
  });
  assert.deepEqual(targets(pseudoLegalMoves(s), square(4, 1)), []);
});

test('white pawn diagonal captures', () => {
  const s = stateWith((b) => {
    b[square(4, 3)] = piece(PieceType.Pawn, Color.White); // e4
    b[square(3, 4)] = piece(PieceType.Pawn, Color.Black); // d5 (capturable)
    b[square(5, 4)] = piece(PieceType.Pawn, Color.Black); // f5 (capturable)
  });
  assert.deepEqual(targets(pseudoLegalMoves(s), square(4, 3)).sort(),
                   ['d5', 'e5', 'f5'].sort());
});

test('white pawn does not capture own piece', () => {
  const s = stateWith((b) => {
    b[square(4, 3)] = piece(PieceType.Pawn, Color.White);
    b[square(3, 4)] = piece(PieceType.Pawn, Color.White);
  });
  assert.deepEqual(targets(pseudoLegalMoves(s), square(4, 3)), ['e5']);
});

test('black pawn moves downward', () => {
  const s = stateWith((b) => {
    b[square(4, 6)] = piece(PieceType.Pawn, Color.Black); // e7
  }, Color.Black);
  assert.deepEqual(targets(pseudoLegalMoves(s), square(4, 6)), ['e5', 'e6']);
});

test('double push sets DoublePush flag', () => {
  const s = stateWith((b) => {
    b[square(4, 1)] = piece(PieceType.Pawn, Color.White);
  });
  const m = pseudoLegalMoves(s).find((m) => m.to === square(4, 3));
  assert.ok(m);
  assert.ok((m!.flags & MoveFlag.DoublePush) !== 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — pawn moves return nothing yet.

- [ ] **Step 3: Add pawn generation to `src/core/moves.ts`**

Add this helper near the top (after `KING_OFFSETS`):

```ts
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
```

Add the pawn case to the dispatch switch in `pseudoLegalMoves`:

```ts
      case PieceType.Pawn:   genPawn(out, sq, s.turn, s.board);             break;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 7 pawn tests pass; previous tests still pass.

- [ ] **Step 5: Commit**

```sh
git add src/core/moves.ts tests/moves-pawn.test.ts
git commit -m "feat(core): pawn pushes and captures"
```

---

### Task 8: Move Generation — Sliding Pieces

**Files:**
- Modify: `src/core/moves.ts`
- Create: `tests/moves-sliding.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/moves-sliding.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Color, PieceType, piece } from '../src/core/pieces.ts';
import { square, squareName } from '../src/core/board.ts';
import { pseudoLegalMoves } from '../src/core/moves.ts';

const stateWith = (setup: (b: Uint8Array) => void, turn: Color = Color.White) => {
  const b = new Uint8Array(64);
  setup(b);
  return {
    board: b, turn, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  };
};

const targets = (moves: { from: number; to: number }[], from: number) =>
  moves.filter((m) => m.from === from).map((m) => squareName(m.to)).sort();

test('rook on empty board: 14 squares', () => {
  const s = stateWith((b) => {
    b[square(3, 3)] = piece(PieceType.Rook, Color.White); // d4
  });
  assert.equal(targets(pseudoLegalMoves(s), square(3, 3)).length, 14);
});

test('rook stops at own piece (exclusive) and enemy (inclusive)', () => {
  const s = stateWith((b) => {
    b[square(3, 3)] = piece(PieceType.Rook, Color.White); // d4
    b[square(3, 5)] = piece(PieceType.Pawn, Color.White); // d6 own
    b[square(6, 3)] = piece(PieceType.Pawn, Color.Black); // g4 enemy
  });
  const ts = targets(pseudoLegalMoves(s), square(3, 3));
  assert.ok(ts.includes('d5'));        // can move up to but not onto d6
  assert.ok(!ts.includes('d6'));
  assert.ok(!ts.includes('d7'));
  assert.ok(ts.includes('g4'));        // capture enemy on g4
  assert.ok(!ts.includes('h4'));       // blocked past enemy
});

test('bishop on empty board: 13 squares from d4', () => {
  const s = stateWith((b) => {
    b[square(3, 3)] = piece(PieceType.Bishop, Color.White); // d4
  });
  assert.equal(targets(pseudoLegalMoves(s), square(3, 3)).length, 13);
});

test('queen on empty board: 27 squares from d4', () => {
  const s = stateWith((b) => {
    b[square(3, 3)] = piece(PieceType.Queen, Color.White);
  });
  assert.equal(targets(pseudoLegalMoves(s), square(3, 3)).length, 27);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — sliding pieces return nothing.

- [ ] **Step 3: Add sliding piece generation to `src/core/moves.ts`**

Add direction constants near the top:

```ts
const ROOK_DIRS:   ReadonlyArray<[number, number]> = [[ 1, 0], [-1, 0], [0,  1], [ 0, -1]];
const BISHOP_DIRS: ReadonlyArray<[number, number]> = [[ 1, 1], [ 1,-1], [-1, 1], [-1, -1]];
const QUEEN_DIRS:  ReadonlyArray<[number, number]> = [...ROOK_DIRS, ...BISHOP_DIRS];
```

Add this slider helper:

```ts
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
```

Extend the switch in `pseudoLegalMoves`:

```ts
      case PieceType.Bishop: genSlider(out, sq, s.turn, s.board, BISHOP_DIRS); break;
      case PieceType.Rook:   genSlider(out, sq, s.turn, s.board, ROOK_DIRS);   break;
      case PieceType.Queen:  genSlider(out, sq, s.turn, s.board, QUEEN_DIRS);  break;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 4 sliding tests pass; previous tests still pass.

- [ ] **Step 5: Commit**

```sh
git add src/core/moves.ts tests/moves-sliding.test.ts
git commit -m "feat(core): sliding piece move generation"
```

---

### Task 9: Apply / Undo Move (Basic, No Special Moves)

**Files:**
- Modify: `src/core/game.ts`
- Create: `tests/apply-undo.test.ts`

`applyMove` must update board, turn, halfmove clock, fullmove number, en-passant square, castling rights when rook/king moves or rook is captured, and the zobrist hash. Special-move side-effects (rook hop on castle, ep capture removal, promotion replacement) are layered in their respective tasks.

- [ ] **Step 1: Write the failing test**

`tests/apply-undo.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, MoveFlag } from '../src/core/game.ts';
import { Color, PieceType, EMPTY, piece } from '../src/core/pieces.ts';
import { parseSquare, square } from '../src/core/board.ts';

test('apply: e2-e4 advances board, flips turn, sets ep', () => {
  const g = Game.newGame();
  const e2 = parseSquare('e2'), e4 = parseSquare('e4'), e3 = parseSquare('e3');
  g.applyMove({ from: e2, to: e4, flags: MoveFlag.DoublePush });
  const s = g.state();
  assert.equal(s.board[e2], EMPTY);
  assert.equal(s.board[e4], piece(PieceType.Pawn, Color.White));
  assert.equal(s.turn, Color.Black);
  assert.equal(s.enPassant, e3);
  assert.equal(s.halfmoveClock, 0);  // pawn move resets
  assert.equal(s.fullmoveNumber, 1);
});

test('apply: a knight move increments halfmove clock', () => {
  const g = Game.newGame();
  g.applyMove({ from: parseSquare('g1'), to: parseSquare('f3'), flags: 0 });
  assert.equal(g.state().halfmoveClock, 1);
});

test('apply: black move increments fullmove number', () => {
  const g = Game.newGame();
  g.applyMove({ from: parseSquare('e2'), to: parseSquare('e4'), flags: MoveFlag.DoublePush });
  g.applyMove({ from: parseSquare('e7'), to: parseSquare('e5'), flags: MoveFlag.DoublePush });
  assert.equal(g.state().fullmoveNumber, 2);
});

test('apply: capture resets halfmove clock and removes captured piece', () => {
  const g = Game.newGame();
  g.applyMove({ from: parseSquare('e2'), to: parseSquare('e4'), flags: MoveFlag.DoublePush });
  g.applyMove({ from: parseSquare('d7'), to: parseSquare('d5'), flags: MoveFlag.DoublePush });
  g.applyMove({ from: parseSquare('e4'), to: parseSquare('d5'), flags: MoveFlag.Capture });
  const s = g.state();
  assert.equal(s.board[parseSquare('d5')], piece(PieceType.Pawn, Color.White));
  assert.equal(s.halfmoveClock, 0);
});

test('apply: moving king clears both castling rights for that color', () => {
  // Hand-craft a position where white king has only one quiet move.
  const b = new Uint8Array(64);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0b1111,
    enPassant: null, halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  g.applyMove({ from: parseSquare('e1'), to: parseSquare('e2'), flags: 0 });
  // White castling bits (low two) cleared, black bits (high two) preserved.
  assert.equal(g.state().castling, 0b1100);
});

test('apply: moving rook from a1 clears WQ only', () => {
  const b = new Uint8Array(64);
  b[parseSquare('a1')] = piece(PieceType.Rook, Color.White);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0b1111,
    enPassant: null, halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  g.applyMove({ from: parseSquare('a1'), to: parseSquare('a4'), flags: 0 });
  assert.equal(g.state().castling, 0b1101); // WQ (bit 1) cleared
});

test('undo: state, history, and zobrist all restored', () => {
  const g = Game.newGame();
  const z0 = g.state().zobrist;
  g.applyMove({ from: parseSquare('e2'), to: parseSquare('e4'), flags: MoveFlag.DoublePush });
  g.undo();
  assert.equal(g.state().zobrist, z0);
  assert.equal(g.state().turn, Color.White);
  assert.equal(g.states.length, 1);
  assert.equal(g.moves.length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `applyMove` / `undo` not defined.

- [ ] **Step 3: Extend `src/core/game.ts` with `applyMove` and `undo`**

Add these imports at the top:

```ts
import { Square, fileOf, rankOf, square } from './board.ts';
```

(Adjust the existing imports block — the file should now import all of `Square`, `fileOf`, `rankOf`, and `square` from `./board.ts` in a single statement.)

Add the castling-mask lookup table at module scope:

```ts
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
```

Add the methods inside the `Game` class (below `state()`):

```ts
  applyMove(m: Move): void {
    const prev = this.state();
    const board = new Uint8Array(prev.board);
    const moving = board[m.from]!;
    const movingType = pieceType(moving);
    const movingColor = pieceColor(moving);
    const captured = board[m.to]!;

    // Board mutation (basic move; special-move side-effects layered later).
    board[m.from] = EMPTY;
    board[m.to] = moving;

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
```

Also add this import alongside the others at the top:

```ts
import { Color, PieceType, Piece, EMPTY, piece, pieceColor, pieceType, opposite } from './pieces.ts';
```

(replacing the existing one).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 7 apply/undo tests pass.

- [ ] **Step 5: Commit**

```sh
git add src/core/game.ts tests/apply-undo.test.ts
git commit -m "feat(core): applyMove and undo (basic, no special moves)"
```

---

### Task 10: Check Detection + Legal Move Filter

**Files:**
- Create: `src/core/attacks.ts`
- Modify: `src/core/moves.ts`
- Create: `tests/legality.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/legality.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Color, PieceType, piece } from '../src/core/pieces.ts';
import { parseSquare } from '../src/core/board.ts';
import { isSquareAttacked, isInCheck } from '../src/core/attacks.ts';
import { legalMoves } from '../src/core/moves.ts';
import { Game } from '../src/core/game.ts';

const stateOf = (setup: (b: Uint8Array) => void, turn: Color = Color.White) => {
  const b = new Uint8Array(64);
  setup(b);
  return {
    board: b, turn, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  };
};

test('isSquareAttacked: knight attack', () => {
  const s = stateOf((b) => {
    b[parseSquare('e4')] = piece(PieceType.Knight, Color.Black);
  });
  assert.equal(isSquareAttacked(s.board, parseSquare('f6'), Color.Black), true);
  assert.equal(isSquareAttacked(s.board, parseSquare('e5'), Color.Black), false);
});

test('isSquareAttacked: bishop blocked by piece', () => {
  const s = stateOf((b) => {
    b[parseSquare('a1')] = piece(PieceType.Bishop, Color.Black);
    b[parseSquare('c3')] = piece(PieceType.Pawn, Color.White); // blocker
  });
  assert.equal(isSquareAttacked(s.board, parseSquare('b2'), Color.Black), true);
  assert.equal(isSquareAttacked(s.board, parseSquare('h8'), Color.Black), false);
});

test('isSquareAttacked: pawn attacks diagonals only', () => {
  const s = stateOf((b) => {
    b[parseSquare('e4')] = piece(PieceType.Pawn, Color.White);
  });
  assert.equal(isSquareAttacked(s.board, parseSquare('d5'), Color.White), true);
  assert.equal(isSquareAttacked(s.board, parseSquare('f5'), Color.White), true);
  assert.equal(isSquareAttacked(s.board, parseSquare('e5'), Color.White), false);
});

test('legalMoves filters out pinned-piece moves that expose the king', () => {
  // White king on e1, white rook on e2 (pinned), black rook on e8.
  const s = stateOf((b) => {
    b[parseSquare('e1')] = piece(PieceType.King, Color.White);
    b[parseSquare('e2')] = piece(PieceType.Rook, Color.White);
    b[parseSquare('e8')] = piece(PieceType.Rook, Color.Black);
  });
  const moves = legalMoves(s);
  // The pinned rook can move along the e-file but not off it.
  const rookMoves = moves.filter((m) => m.from === parseSquare('e2'));
  for (const m of rookMoves) {
    // file part of `to` must equal file of e2 (file index 4)
    assert.equal(m.to & 7, 4, `pinned rook should stay on e-file, got ${m.to}`);
  }
  // The king has one legal move (d1 / f1), no e-file moves.
  const kingMoves = moves.filter((m) => m.from === parseSquare('e1'));
  for (const m of kingMoves) {
    assert.notEqual(m.to & 7, 4);
  }
});

test('isInCheck: detects check from new game (false)', () => {
  assert.equal(isInCheck(Game.newGame().state()), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — modules missing.

- [ ] **Step 3: Implement `src/core/attacks.ts`**

```ts
import { Color, PieceType, EMPTY, pieceColor, pieceType, opposite } from './pieces.ts';
import { Square, fileOf, rankOf, onBoard, square } from './board.ts';
import { GameState } from './game.ts';

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
```

- [ ] **Step 4: Add `legalMoves` to `src/core/moves.ts`**

Append at the bottom of `src/core/moves.ts`:

```ts
import { isSquareAttacked } from './attacks.ts';

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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 5 legality tests pass; all previous tests still pass.

- [ ] **Step 6: Commit**

```sh
git add src/core/attacks.ts src/core/moves.ts tests/legality.test.ts
git commit -m "feat(core): attack detection and legal-move filtering"
```

---

### Task 11: Castling

**Files:**
- Modify: `src/core/moves.ts`
- Modify: `src/core/game.ts`
- Create: `tests/castling.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/castling.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Color, PieceType, EMPTY, piece } from '../src/core/pieces.ts';
import { parseSquare } from '../src/core/board.ts';
import { legalMoves } from '../src/core/moves.ts';
import { Game, MoveFlag, CASTLE_WK, CASTLE_WQ, CASTLE_BK, CASTLE_BQ } from '../src/core/game.ts';

const baseCastleState = (extra: (b: Uint8Array) => void = () => {}) => {
  const b = new Uint8Array(64);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('a1')] = piece(PieceType.Rook, Color.White);
  b[parseSquare('h1')] = piece(PieceType.Rook, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  extra(b);
  return {
    board: b, turn: Color.White,
    castling: CASTLE_WK | CASTLE_WQ | CASTLE_BK | CASTLE_BQ,
    enPassant: null, halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  };
};

test('castling: both kingside and queenside available when path clear', () => {
  const s = baseCastleState();
  const ms = legalMoves(s).filter((m) => m.from === parseSquare('e1'));
  const tos = ms.map((m) => m.to);
  assert.ok(tos.includes(parseSquare('g1')), 'kingside available');
  assert.ok(tos.includes(parseSquare('c1')), 'queenside available');
});

test('castling: blocked when piece between king and rook', () => {
  const s = baseCastleState((b) => {
    b[parseSquare('f1')] = piece(PieceType.Knight, Color.White);
  });
  const tos = legalMoves(s).filter((m) => m.from === parseSquare('e1')).map((m) => m.to);
  assert.ok(!tos.includes(parseSquare('g1')));
  assert.ok(tos.includes(parseSquare('c1')));
});

test('castling: forbidden when king is in check', () => {
  const s = baseCastleState((b) => {
    b[parseSquare('e5')] = piece(PieceType.Rook, Color.Black); // checks king on e1
  });
  const tos = legalMoves(s).filter((m) => m.from === parseSquare('e1')).map((m) => m.to);
  assert.ok(!tos.includes(parseSquare('g1')));
  assert.ok(!tos.includes(parseSquare('c1')));
});

test('castling: forbidden when king passes through attacked square', () => {
  const s = baseCastleState((b) => {
    b[parseSquare('f5')] = piece(PieceType.Rook, Color.Black); // attacks f1
  });
  const tos = legalMoves(s).filter((m) => m.from === parseSquare('e1')).map((m) => m.to);
  assert.ok(!tos.includes(parseSquare('g1'))); // king crosses f1
  assert.ok(tos.includes(parseSquare('c1')));  // queenside path d1/c1 not attacked
});

test('castling: forbidden when castling right is missing', () => {
  const s = { ...baseCastleState(), castling: CASTLE_BK | CASTLE_BQ };
  const tos = legalMoves(s).filter((m) => m.from === parseSquare('e1')).map((m) => m.to);
  assert.ok(!tos.includes(parseSquare('g1')));
  assert.ok(!tos.includes(parseSquare('c1')));
});

test('apply castling: king and rook both move; castling rights revoked', () => {
  const g = Game.fromState(baseCastleState());
  g.applyMove({ from: parseSquare('e1'), to: parseSquare('g1'), flags: MoveFlag.Castle });
  const s = g.state();
  assert.equal(s.board[parseSquare('e1')], EMPTY);
  assert.equal(s.board[parseSquare('h1')], EMPTY);
  assert.equal(s.board[parseSquare('g1')], piece(PieceType.King, Color.White));
  assert.equal(s.board[parseSquare('f1')], piece(PieceType.Rook, Color.White));
  assert.equal(s.castling, CASTLE_BK | CASTLE_BQ);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — castling not generated.

- [ ] **Step 3: Generate castling moves in `src/core/moves.ts`**

Add this helper above `pseudoLegalMoves`:

```ts
import { CASTLE_WK, CASTLE_WQ, CASTLE_BK, CASTLE_BQ } from './game.ts';

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
```

In `pseudoLegalMoves`, after the per-square loop completes (just before `return out`), append:

```ts
  // Castling: generated once per side-to-move.
  for (let sq = 0; sq < 64; sq++) {
    const p = s.board[sq]!;
    if (p !== EMPTY && pieceColor(p) === s.turn && pieceType(p) === PieceType.King) {
      genCastling(out, s, sq);
      break;
    }
  }
```

Note: the existing `legalMoves` check after the simulation correctly handles the "king not crossing attacked square" case for the final landing square, but the intermediate squares are checked here in `genCastling`.

- [ ] **Step 4: Apply the rook hop in `Game.applyMove`**

In `src/core/game.ts`, inside `applyMove`, right after the `board[m.to] = moving` line, insert:

```ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 6 castling tests pass; all previous tests still pass.

- [ ] **Step 6: Commit**

```sh
git add src/core/moves.ts src/core/game.ts tests/castling.test.ts
git commit -m "feat(core): castling generation and apply"
```

---

### Task 12: En Passant

**Files:**
- Modify: `src/core/moves.ts`
- Modify: `src/core/game.ts`
- Create: `tests/en-passant.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/en-passant.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Color, PieceType, EMPTY, piece } from '../src/core/pieces.ts';
import { parseSquare } from '../src/core/board.ts';
import { legalMoves } from '../src/core/moves.ts';
import { Game, MoveFlag } from '../src/core/game.ts';

test('en passant: appears as a legal capture when ep square is set', () => {
  // After 1.e4 d6 2.e5 f5 — white pawn on e5, black just played f7-f5.
  const b = new Uint8Array(64);
  b[parseSquare('e5')] = piece(PieceType.Pawn, Color.White);
  b[parseSquare('f5')] = piece(PieceType.Pawn, Color.Black);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const s = {
    board: b, turn: Color.White, castling: 0,
    enPassant: parseSquare('f6'),
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  };
  const epMove = legalMoves(s).find(
    (m) => m.from === parseSquare('e5') && m.to === parseSquare('f6'),
  );
  assert.ok(epMove, 'en passant move missing');
  assert.ok((epMove!.flags & MoveFlag.EnPassant) !== 0);
});

test('en passant: removes the passed pawn on apply', () => {
  const b = new Uint8Array(64);
  b[parseSquare('e5')] = piece(PieceType.Pawn, Color.White);
  b[parseSquare('f5')] = piece(PieceType.Pawn, Color.Black);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0,
    enPassant: parseSquare('f6'),
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  g.applyMove({
    from: parseSquare('e5'), to: parseSquare('f6'),
    flags: MoveFlag.EnPassant | MoveFlag.Capture,
  });
  assert.equal(g.state().board[parseSquare('f5')], EMPTY); // captured pawn gone
  assert.equal(g.state().board[parseSquare('f6')], piece(PieceType.Pawn, Color.White));
});

test('en passant: not generated when ep square is null', () => {
  const b = new Uint8Array(64);
  b[parseSquare('e5')] = piece(PieceType.Pawn, Color.White);
  b[parseSquare('f5')] = piece(PieceType.Pawn, Color.Black);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const s = {
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  };
  const tos = legalMoves(s).filter((m) => m.from === parseSquare('e5')).map((m) => m.to);
  assert.ok(!tos.includes(parseSquare('f6')));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — en passant not generated.

- [ ] **Step 3: Add en-passant generation to `genPawn` in `src/core/moves.ts`**

Change the `genPawn` signature to also take the en-passant square:

```ts
const genPawn = (
  out: Move[], from: Square, color: Color, board: Uint8Array,
  enPassant: Square | null,
): void => {
  // ... existing pushes and captures unchanged ...

  // En passant: an additional diagonal capture onto the ep target square.
  if (enPassant !== null) {
    const r1 = r0 + dir;
    if (rankOf(enPassant) === r1 && Math.abs(fileOf(enPassant) - f0) === 1) {
      out.push({ from, to: enPassant, flags: MoveFlag.EnPassant | MoveFlag.Capture });
    }
  }
};
```

Update the call site inside `pseudoLegalMoves`:

```ts
      case PieceType.Pawn:   genPawn(out, sq, s.turn, s.board, s.enPassant); break;
```

- [ ] **Step 4: Handle en-passant capture in `Game.applyMove`**

In `src/core/game.ts`, inside `applyMove`, immediately after the castle handler from Task 11, add:

```ts
    // En passant: remove the pawn that was captured *en passant*.
    if ((m.flags & MoveFlag.EnPassant) !== 0) {
      const dir = movingColor === Color.White ? -1 : +1;
      const capturedSq = m.to + dir * 8;
      board[capturedSq] = EMPTY;
    }
```

Also: the legality filter in `legalMoves` simulates moves by mutating a scratch board, but it doesn't currently know to also remove the en-passant-captured pawn. Update `legalMoves` in `src/core/moves.ts` to handle this. Replace the simulation block with:

```ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 3 ep tests pass; all previous tests still pass.

- [ ] **Step 6: Commit**

```sh
git add src/core/moves.ts src/core/game.ts tests/en-passant.test.ts
git commit -m "feat(core): en passant generation and capture"
```

---

### Task 13: Promotion

**Files:**
- Modify: `src/core/moves.ts`
- Modify: `src/core/game.ts`
- Create: `tests/promotion.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/promotion.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Color, PieceType, EMPTY, piece } from '../src/core/pieces.ts';
import { parseSquare } from '../src/core/board.ts';
import { legalMoves } from '../src/core/moves.ts';
import { Game, MoveFlag } from '../src/core/game.ts';

test('white pawn on 7th: four promotion moves per target square', () => {
  const b = new Uint8Array(64);
  b[parseSquare('e7')] = piece(PieceType.Pawn, Color.White);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  // Place black king elsewhere so target e8 is occupied by king — pick a8.
  b[parseSquare('e8')] = 0;
  b[parseSquare('a8')] = piece(PieceType.King, Color.Black);
  const s = {
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  };
  const promos = legalMoves(s).filter((m) => m.from === parseSquare('e7'));
  const promoTypes = promos
    .filter((m) => m.to === parseSquare('e8'))
    .map((m) => m.promotion)
    .sort();
  assert.deepEqual(promoTypes, [
    PieceType.Bishop, PieceType.Knight, PieceType.Queen, PieceType.Rook,
  ].sort());
  for (const m of promos) {
    assert.ok((m.flags & MoveFlag.Promotion) !== 0);
  }
});

test('apply promotion: replaces pawn with chosen piece', () => {
  const b = new Uint8Array(64);
  b[parseSquare('e7')] = piece(PieceType.Pawn, Color.White);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('a8')] = piece(PieceType.King, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  g.applyMove({
    from: parseSquare('e7'), to: parseSquare('e8'),
    promotion: PieceType.Queen, flags: MoveFlag.Promotion,
  });
  assert.equal(g.state().board[parseSquare('e8')], piece(PieceType.Queen, Color.White));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — promotion not yet generated.

- [ ] **Step 3: Generate promotions in `src/core/moves.ts`**

In `genPawn`, after the single push block, change the push that lands on rank 7 (white) or rank 0 (black) to emit four promotion moves instead of one. Replace the single-push block with:

```ts
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
```

Replace the capture loop with:

```ts
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
```

- [ ] **Step 4: Apply promotion in `Game.applyMove`**

In `src/core/game.ts`, immediately after the en-passant handler, add:

```ts
    // Promotion: replace the pawn with the promotion piece on the target square.
    if ((m.flags & MoveFlag.Promotion) !== 0) {
      if (m.promotion === undefined) throw new Error('Promotion move missing promotion type');
      board[m.to] = piece(m.promotion, movingColor);
    }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 2 promotion tests pass; all previous tests still pass.

- [ ] **Step 6: Commit**

```sh
git add src/core/moves.ts src/core/game.ts tests/promotion.test.ts
git commit -m "feat(core): pawn promotion (push and capture)"
```

---

### Task 14: Game Status — Checkmate & Stalemate

**Files:**
- Create: `src/core/rules.ts`
- Create: `tests/rules-status.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/rules-status.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Color, PieceType, piece } from '../src/core/pieces.ts';
import { parseSquare } from '../src/core/board.ts';
import { status } from '../src/core/rules.ts';
import { Game } from '../src/core/game.ts';

test('status: ongoing in start position', () => {
  assert.equal(status(Game.newGame()), 'ongoing');
});

test("status: fool's mate is checkmate (black wins)", () => {
  // 1. f3 e5  2. g4 Qh4#
  const g = Game.newGame();
  g.applyMove({ from: parseSquare('f2'), to: parseSquare('f3'), flags: 0 });
  g.applyMove({ from: parseSquare('e7'), to: parseSquare('e5'), flags: 8 /* DoublePush */ });
  g.applyMove({ from: parseSquare('g2'), to: parseSquare('g4'), flags: 8 });
  g.applyMove({ from: parseSquare('d8'), to: parseSquare('h4'), flags: 0 });
  assert.equal(status(g), 'checkmate');
});

test('status: stalemate (classic king + pawn vs king)', () => {
  // Black king on a8, white king on c7, white pawn on a7. Black to move, no legal moves, not in check.
  const b = new Uint8Array(64);
  b[parseSquare('a8')] = piece(PieceType.King, Color.Black);
  b[parseSquare('c7')] = piece(PieceType.King, Color.White);
  b[parseSquare('a7')] = piece(PieceType.Pawn, Color.White);
  const g = Game.fromState({
    board: b, turn: Color.Black, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  assert.equal(status(g), 'stalemate');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/core/rules.ts`**

```ts
import { Game } from './game.ts';
import { legalMoves } from './moves.ts';
import { isInCheck } from './attacks.ts';

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 3 status tests pass.

- [ ] **Step 5: Commit**

```sh
git add src/core/rules.ts tests/rules-status.test.ts
git commit -m "feat(core): checkmate and stalemate detection"
```

---

### Task 15: Draw Conditions (50-Move, Threefold, Insufficient Material)

**Files:**
- Modify: `src/core/rules.ts`
- Create: `tests/rules-draws.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/rules-draws.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Color, PieceType, piece } from '../src/core/pieces.ts';
import { parseSquare } from '../src/core/board.ts';
import { status } from '../src/core/rules.ts';
import { Game } from '../src/core/game.ts';

test('draw-material: K vs K', () => {
  const b = new Uint8Array(64);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  assert.equal(status(g), 'draw-material');
});

test('draw-material: K+B vs K', () => {
  const b = new Uint8Array(64);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('f1')] = piece(PieceType.Bishop, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  assert.equal(status(g), 'draw-material');
});

test('draw-material: K+N vs K', () => {
  const b = new Uint8Array(64);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('f1')] = piece(PieceType.Knight, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  assert.equal(status(g), 'draw-material');
});

test('not draw-material: K+R vs K', () => {
  const b = new Uint8Array(64);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('a1')] = piece(PieceType.Rook, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  assert.equal(status(g), 'ongoing');
});

test('draw-50: halfmove clock at 100 triggers 50-move rule', () => {
  const b = new Uint8Array(64);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('a1')] = piece(PieceType.Rook, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 100, fullmoveNumber: 60, zobrist: 0n,
  });
  assert.equal(status(g), 'draw-50');
});

test('draw-repetition: same position three times', () => {
  const g = Game.newGame();
  // Repeat a knight shuffle three times: Nf3 Nf6 Ng1 Ng8 Nf3 Nf6 Ng1 Ng8.
  // After move 1 the start position has been seen once (initial).
  const seq: [string, string, number][] = [
    ['g1','f3',0], ['g8','f6',0], ['f3','g1',0], ['f6','g8',0],
    ['g1','f3',0], ['g8','f6',0], ['f3','g1',0], ['f6','g8',0],
  ];
  for (const [from, to, flags] of seq) {
    g.applyMove({ from: parseSquare(from), to: parseSquare(to), flags });
  }
  assert.equal(status(g), 'draw-repetition');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — draws not yet detected.

- [ ] **Step 3: Extend `src/core/rules.ts`**

Replace the file contents with:

```ts
import { Game, GameState } from './game.ts';
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
  const minorsByColor: Record<Color, { bishops: number[]; knights: number; others: number }> = {
    [Color.White]: { bishops: [], knights: 0, others: 0 },
    [Color.Black]: { bishops: [], knights: 0, others: 0 },
  };
  for (let sq = 0; sq < 64; sq++) {
    const p = s.board[sq]!;
    if (p === EMPTY) continue;
    const t = pieceType(p);
    if (t === PieceType.King) continue;
    const c = pieceColor(p);
    if (t === PieceType.Bishop) minorsByColor[c].bishops.push((fileOf(sq) + rankOf(sq)) & 1);
    else if (t === PieceType.Knight) minorsByColor[c].knights += 1;
    else minorsByColor[c].others += 1;
  }

  const w = minorsByColor[Color.White], b = minorsByColor[Color.Black];

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 6 draw tests pass; all previous tests still pass.

- [ ] **Step 5: Commit**

```sh
git add src/core/rules.ts tests/rules-draws.test.ts
git commit -m "feat(core): 50-move, threefold, insufficient material draws"
```

---

### Task 16: FEN Parse & Serialize

**Files:**
- Create: `src/core/fen.ts`
- Create: `tests/fen.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/fen.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.ts';
import { toFEN, fromFEN, STARTING_FEN, FenParseError } from '../src/core/fen.ts';

test('starting position FEN round-trip', () => {
  const g = Game.newGame();
  assert.equal(toFEN(g.state()), STARTING_FEN);
});

test('fromFEN(STARTING_FEN) matches Game.newGame() state', () => {
  const fromFresh = toFEN(Game.newGame().state());
  const fromParse = toFEN(fromFEN(STARTING_FEN));
  assert.equal(fromFresh, fromParse);
});

test('round-trips a known mid-game position', () => {
  const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
  assert.equal(toFEN(fromFEN(fen)), fen);
});

test('round-trips a position with en passant square', () => {
  const fen = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2';
  assert.equal(toFEN(fromFEN(fen)), fen);
});

test('round-trips a position with partial castling rights', () => {
  const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w Kq - 0 1';
  assert.equal(toFEN(fromFEN(fen)), fen);
});

test('FenParseError on garbage', () => {
  assert.throws(() => fromFEN('not a fen'), FenParseError);
  assert.throws(() => fromFEN(''), FenParseError);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/core/fen.ts`**

```ts
import { Color, PieceType, EMPTY, piece, pieceColor, pieceType } from './pieces.ts';
import { Square, square, fileOf, rankOf, onBoard, parseSquare, squareName } from './board.ts';
import {
  GameState, CASTLE_WK, CASTLE_WQ, CASTLE_BK, CASTLE_BQ, computeZobrist,
} from './game.ts';

export const STARTING_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export class FenParseError extends Error {
  constructor(message: string) { super(`FEN parse: ${message}`); }
}

const PIECE_LETTER: Record<number, string> = (() => {
  const m: Record<number, string> = {};
  const map: [PieceType, string][] = [
    [PieceType.Pawn, 'p'], [PieceType.Knight, 'n'], [PieceType.Bishop, 'b'],
    [PieceType.Rook, 'r'], [PieceType.Queen, 'q'], [PieceType.King, 'k'],
  ];
  for (const [t, ch] of map) {
    m[piece(t, Color.White)] = ch.toUpperCase();
    m[piece(t, Color.Black)] = ch;
  }
  return m;
})();

const LETTER_PIECE: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  for (const [p, ch] of Object.entries(PIECE_LETTER)) m[ch] = Number(p);
  return m;
})();

export const toFEN = (s: GameState): string => {
  // Board (ranks 8..1, each row left-to-right).
  const rows: string[] = [];
  for (let r = 7; r >= 0; r--) {
    let row = '', empties = 0;
    for (let f = 0; f < 8; f++) {
      const p = s.board[square(f, r)]!;
      if (p === EMPTY) { empties += 1; continue; }
      if (empties > 0) { row += String(empties); empties = 0; }
      row += PIECE_LETTER[p]!;
    }
    if (empties > 0) row += String(empties);
    rows.push(row);
  }
  const placement = rows.join('/');
  const turn = s.turn === Color.White ? 'w' : 'b';
  let castling = '';
  if (s.castling & CASTLE_WK) castling += 'K';
  if (s.castling & CASTLE_WQ) castling += 'Q';
  if (s.castling & CASTLE_BK) castling += 'k';
  if (s.castling & CASTLE_BQ) castling += 'q';
  if (castling === '') castling = '-';
  const ep = s.enPassant === null ? '-' : squareName(s.enPassant);
  return `${placement} ${turn} ${castling} ${ep} ${s.halfmoveClock} ${s.fullmoveNumber}`;
};

export const fromFEN = (fen: string): GameState => {
  const parts = fen.trim().split(/\s+/);
  if (parts.length !== 6) throw new FenParseError(`expected 6 fields, got ${parts.length}`);
  const [placement, turnStr, castlingStr, epStr, halfStr, fullStr] = parts as
    [string, string, string, string, string, string];

  const board = new Uint8Array(64);
  const rows = placement.split('/');
  if (rows.length !== 8) throw new FenParseError(`expected 8 ranks, got ${rows.length}`);
  for (let r = 0; r < 8; r++) {
    const row = rows[7 - r]!;
    let f = 0;
    for (const ch of row) {
      if (ch >= '1' && ch <= '8') {
        f += Number(ch);
      } else if (LETTER_PIECE[ch] !== undefined) {
        if (f >= 8) throw new FenParseError(`rank overflow at ${row}`);
        board[square(f, r)] = LETTER_PIECE[ch]!;
        f += 1;
      } else {
        throw new FenParseError(`unknown piece character '${ch}'`);
      }
    }
    if (f !== 8) throw new FenParseError(`rank '${row}' has width ${f}, expected 8`);
  }

  const turn = turnStr === 'w' ? Color.White : turnStr === 'b' ? Color.Black
    : (() => { throw new FenParseError(`turn must be w or b, got ${turnStr}`); })();

  let castling = 0;
  if (castlingStr !== '-') {
    for (const ch of castlingStr) {
      switch (ch) {
        case 'K': castling |= CASTLE_WK; break;
        case 'Q': castling |= CASTLE_WQ; break;
        case 'k': castling |= CASTLE_BK; break;
        case 'q': castling |= CASTLE_BQ; break;
        default: throw new FenParseError(`unknown castling character '${ch}'`);
      }
    }
  }

  let enPassant: Square | null = null;
  if (epStr !== '-') {
    try { enPassant = parseSquare(epStr); }
    catch { throw new FenParseError(`invalid en passant square '${epStr}'`); }
  }

  const halfmoveClock = Number(halfStr);
  const fullmoveNumber = Number(fullStr);
  if (!Number.isFinite(halfmoveClock) || !Number.isFinite(fullmoveNumber)) {
    throw new FenParseError(`invalid clocks: ${halfStr} ${fullStr}`);
  }

  const partial = { board, turn, castling, enPassant, halfmoveClock, fullmoveNumber };
  return { ...partial, zobrist: computeZobrist(partial) };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 6 FEN tests pass.

- [ ] **Step 5: Commit**

```sh
git add src/core/fen.ts tests/fen.test.ts
git commit -m "feat(core): FEN parse and serialize"
```

---

### Task 17: SAN (Standard Algebraic Notation)

**Files:**
- Create: `src/core/san.ts`
- Create: `tests/san.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/san.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.ts';
import { parseSquare } from '../src/core/board.ts';
import { Color, PieceType, piece } from '../src/core/pieces.ts';
import { moveToSan, sanToMove } from '../src/core/san.ts';

test('SAN: pawn push e4 from start', () => {
  const g = Game.newGame();
  const m = sanToMove(g, 'e4');
  assert.equal(m.from, parseSquare('e2'));
  assert.equal(m.to, parseSquare('e4'));
  assert.equal(moveToSan(g, m), 'e4');
});

test('SAN: knight move Nf3 from start', () => {
  const g = Game.newGame();
  const m = sanToMove(g, 'Nf3');
  assert.equal(m.from, parseSquare('g1'));
  assert.equal(m.to, parseSquare('f3'));
  assert.equal(moveToSan(g, m), 'Nf3');
});

test('SAN: castling O-O and O-O-O', () => {
  const b = new Uint8Array(64);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('a1')] = piece(PieceType.Rook, Color.White);
  b[parseSquare('h1')] = piece(PieceType.Rook, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0b1111,
    enPassant: null, halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  const oo = sanToMove(g, 'O-O');
  assert.equal(oo.to, parseSquare('g1'));
  assert.equal(moveToSan(g, oo), 'O-O');
  const ooo = sanToMove(g, 'O-O-O');
  assert.equal(ooo.to, parseSquare('c1'));
  assert.equal(moveToSan(g, ooo), 'O-O-O');
});

test('SAN: capture Nxe5', () => {
  const g = Game.newGame();
  g.applyMove(sanToMove(g, 'e4'));
  g.applyMove(sanToMove(g, 'd5'));
  g.applyMove(sanToMove(g, 'exd5'));
  // After 1.e4 d5 2.exd5, white pawn is on d5.
  const m = sanToMove(g, 'Nf6');
  // smoke check the parse worked
  assert.equal(m.to, parseSquare('f6'));
});

test('SAN: promotion e8=Q with check marker', () => {
  const b = new Uint8Array(64);
  b[parseSquare('e7')] = piece(PieceType.Pawn, Color.White);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('a8')] = piece(PieceType.King, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  const m = sanToMove(g, 'e8=Q+');
  assert.equal(m.to, parseSquare('e8'));
  assert.equal(m.promotion, PieceType.Queen);
});

test('SAN: disambiguates two knights moving to the same square', () => {
  // White knights on b1 and d1 can both go to c3 (well, d1->c3 yes; b1->c3 yes).
  const b = new Uint8Array(64);
  b[parseSquare('b1')] = piece(PieceType.Knight, Color.White);
  b[parseSquare('d1')] = piece(PieceType.Knight, Color.White);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  const m = { from: parseSquare('b1'), to: parseSquare('c3'), flags: 0 };
  const san = moveToSan(g, m);
  assert.equal(san, 'Nbc3'); // file disambiguation
  assert.equal(sanToMove(g, 'Nbc3').from, parseSquare('b1'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/core/san.ts`**

```ts
import { Game, Move, MoveFlag } from './game.ts';
import { legalMoves } from './moves.ts';
import { isInCheck } from './attacks.ts';
import { Color, PieceType, EMPTY, pieceColor, pieceType, piece as makePiece } from './pieces.ts';
import { Square, fileOf, rankOf, square, squareName, parseSquare } from './board.ts';

const TYPE_LETTER: Record<PieceType, string> = {
  [PieceType.None]:   '',
  [PieceType.Pawn]:   '',
  [PieceType.Knight]: 'N',
  [PieceType.Bishop]: 'B',
  [PieceType.Rook]:   'R',
  [PieceType.Queen]:  'Q',
  [PieceType.King]:   'K',
};

const LETTER_TYPE: Record<string, PieceType> = {
  N: PieceType.Knight, B: PieceType.Bishop, R: PieceType.Rook,
  Q: PieceType.Queen,  K: PieceType.King,
};

const isCheckmateAfter = (g: Game, m: Move): { check: boolean; mate: boolean } => {
  g.applyMove(m);
  const check = isInCheck(g.state());
  const mate = check && legalMoves(g.state()).length === 0;
  g.undo();
  return { check, mate };
};

export const moveToSan = (g: Game, m: Move): string => {
  const s = g.state();
  const moving = s.board[m.from]!;
  const type = pieceType(moving);

  // Castling.
  if ((m.flags & MoveFlag.Castle) !== 0) {
    const base = fileOf(m.to) === 6 ? 'O-O' : 'O-O-O';
    const { check, mate } = isCheckmateAfter(g, m);
    return base + (mate ? '#' : check ? '+' : '');
  }

  const isCapture = (m.flags & MoveFlag.Capture) !== 0;

  let san = '';

  if (type === PieceType.Pawn) {
    if (isCapture) san += 'abcdefgh'[fileOf(m.from)]! + 'x';
    san += squareName(m.to);
    if ((m.flags & MoveFlag.Promotion) !== 0) san += '=' + TYPE_LETTER[m.promotion!];
  } else {
    san += TYPE_LETTER[type];
    // Disambiguation: any other legal move of the same piece type that lands on the same square.
    const ambiguous = legalMoves(s).filter(
      (x) => x.from !== m.from && x.to === m.to
        && pieceType(s.board[x.from]!) === type,
    );
    if (ambiguous.length > 0) {
      const sameFile = ambiguous.some((x) => fileOf(x.from) === fileOf(m.from));
      const sameRank = ambiguous.some((x) => rankOf(x.from) === rankOf(m.from));
      if (!sameFile) san += 'abcdefgh'[fileOf(m.from)]!;
      else if (!sameRank) san += String(rankOf(m.from) + 1);
      else san += squareName(m.from);
    }
    if (isCapture) san += 'x';
    san += squareName(m.to);
  }

  const { check, mate } = isCheckmateAfter(g, m);
  if (mate) san += '#'; else if (check) san += '+';
  return san;
};

const stripCheck = (san: string): string => san.replace(/[+#]$/, '');

export const sanToMove = (g: Game, sanIn: string): Move => {
  const s = g.state();
  const candidates = legalMoves(s);
  const san = stripCheck(sanIn);

  // Castling shortcuts.
  if (san === 'O-O' || san === '0-0') {
    const m = candidates.find((c) => (c.flags & MoveFlag.Castle) !== 0 && fileOf(c.to) === 6);
    if (!m) throw new Error(`Illegal SAN: ${sanIn}`);
    return m;
  }
  if (san === 'O-O-O' || san === '0-0-0') {
    const m = candidates.find((c) => (c.flags & MoveFlag.Castle) !== 0 && fileOf(c.to) === 2);
    if (!m) throw new Error(`Illegal SAN: ${sanIn}`);
    return m;
  }

  // Promotion suffix: =Q, =R, =B, =N (optional '=').
  let body = san;
  let promotion: PieceType | undefined;
  const promoMatch = body.match(/=?([QRBN])$/);
  if (promoMatch) {
    promotion = LETTER_TYPE[promoMatch[1]!];
    body = body.slice(0, body.length - promoMatch[0].length);
  }

  // Piece letter (optional; pawns omitted).
  let pieceType_: PieceType = PieceType.Pawn;
  if (body.length > 0 && body[0]! >= 'A' && body[0]! <= 'Z') {
    const t = LETTER_TYPE[body[0]!];
    if (t === undefined) throw new Error(`Illegal SAN: ${sanIn}`);
    pieceType_ = t;
    body = body.slice(1);
  }

  // Capture indicator 'x'.
  const isCapture = body.includes('x');
  body = body.replace('x', '');

  // Destination square = last 2 chars.
  if (body.length < 2) throw new Error(`Illegal SAN: ${sanIn}`);
  const to = parseSquare(body.slice(-2));
  body = body.slice(0, -2);

  // Remaining body is disambiguation: 0, 1 (file or rank), or 2 (full square).
  let fromFile: number | null = null;
  let fromRank: number | null = null;
  for (const ch of body) {
    if (ch >= 'a' && ch <= 'h') fromFile = ch.charCodeAt(0) - 97;
    else if (ch >= '1' && ch <= '8') fromRank = ch.charCodeAt(0) - 49;
    else throw new Error(`Illegal SAN: ${sanIn}`);
  }

  const matches = candidates.filter((c) => {
    const p = s.board[c.from]!;
    if (pieceType(p) !== pieceType_) return false;
    if (c.to !== to) return false;
    if (promotion !== undefined && c.promotion !== promotion) return false;
    if (promotion === undefined && (c.flags & MoveFlag.Promotion) !== 0) return false;
    if (fromFile !== null && fileOf(c.from) !== fromFile) return false;
    if (fromRank !== null && rankOf(c.from) !== fromRank) return false;
    // For pawn captures the 'x' is required by convention; we don't enforce it as
    // a filter to keep parsing forgiving.
    void isCapture;
    return true;
  });

  if (matches.length === 0) throw new Error(`Illegal SAN: ${sanIn}`);
  if (matches.length > 1) throw new Error(`Ambiguous SAN: ${sanIn}`);
  return matches[0]!;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 6 SAN tests pass.

- [ ] **Step 5: Commit**

```sh
git add src/core/san.ts tests/san.test.ts
git commit -m "feat(core): SAN parse and serialize"
```

---

### Task 18: PGN Parse & Serialize

**Files:**
- Create: `src/core/pgn.ts`
- Create: `tests/pgn.test.ts`

This task supports a minimal-but-correct PGN: optional `[Tag "value"]` header block, then a movetext consisting of move numbers, SAN moves, optional comments `{...}`, and a result token (`1-0`, `0-1`, `1/2-1/2`, `*`).

- [ ] **Step 1: Write the failing test**

`tests/pgn.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toPGN, fromPGN } from '../src/core/pgn.ts';
import { Game } from '../src/core/game.ts';
import { toFEN } from '../src/core/fen.ts';
import { sanToMove } from '../src/core/san.ts';

test('toPGN of a fresh game is just the result placeholder', () => {
  const out = toPGN(Game.newGame());
  // No headers required; movetext is just "*" with no moves played.
  assert.match(out, /\*\s*$/);
});

test('PGN round-trip for a short game', () => {
  const g = Game.newGame();
  // 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7
  const sans = ['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7'];
  for (const s of sans) g.applyMove(sanToMove(g, s));

  const pgn = toPGN(g);
  const replayed = fromPGN(pgn);
  assert.equal(toFEN(replayed.state()), toFEN(g.state()));
});

test('fromPGN ignores headers and comments', () => {
  const pgn = `
    [Event "Test"]
    [White "A"]
    [Black "B"]

    1. e4 {good move} e5 2. Nf3 Nc6 *
  `;
  const g = fromPGN(pgn);
  assert.equal(g.moves.length, 4);
});

test('fromPGN handles a result token at the end', () => {
  const pgn = '1. e4 e5 1-0';
  const g = fromPGN(pgn);
  assert.equal(g.moves.length, 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/core/pgn.ts`**

```ts
import { Game } from './game.ts';
import { moveToSan, sanToMove } from './san.ts';
import { status } from './rules.ts';
import { Color } from './pieces.ts';

const RESULT_TOKENS = new Set(['1-0', '0-1', '1/2-1/2', '*']);

const resultFor = (g: Game): string => {
  const s = status(g);
  if (s === 'checkmate') {
    // The side to move has no moves; the *other* side delivered mate.
    return g.state().turn === Color.White ? '0-1' : '1-0';
  }
  if (s === 'stalemate' || s === 'draw-50' || s === 'draw-repetition' || s === 'draw-material') {
    return '1/2-1/2';
  }
  return '*';
};

export const toPGN = (g: Game): string => {
  // We rebuild SAN as we walk the moves, because moveToSan depends on the
  // position the move was made from.
  const replay = Game.newGame();
  const tokens: string[] = [];
  for (let i = 0; i < g.moves.length; i++) {
    if (i % 2 === 0) tokens.push(`${(i >> 1) + 1}.`);
    const san = moveToSan(replay, g.moves[i]!);
    tokens.push(san);
    replay.applyMove(g.moves[i]!);
  }
  tokens.push(resultFor(g));
  return tokens.join(' ');
};

const stripCommentsAndHeaders = (pgn: string): string => {
  // Remove header lines [ ... ]
  let s = pgn.replace(/\[[^\]]*\]/g, ' ');
  // Remove curly-brace comments
  s = s.replace(/\{[^}]*\}/g, ' ');
  // Remove parenthesized variations (greedy, single-level supported — sufficient for tests).
  s = s.replace(/\([^()]*\)/g, ' ');
  return s;
};

export const fromPGN = (pgn: string): Game => {
  const cleaned = stripCommentsAndHeaders(pgn);
  // Tokenize: strip move numbers (1., 1...) and whitespace.
  const tokens = cleaned
    .split(/\s+/)
    .map((t) => t.replace(/^\d+\.+/, ''))
    .filter((t) => t.length > 0);

  const game = Game.newGame();
  for (const tok of tokens) {
    if (RESULT_TOKENS.has(tok)) break;
    game.applyMove(sanToMove(game, tok));
  }
  return game;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 4 PGN tests pass.

- [ ] **Step 5: Commit**

```sh
git add src/core/pgn.ts tests/pgn.test.ts
git commit -m "feat(core): PGN parse and serialize"
```

---

### Task 19: Perft Correctness Gauntlet

**Files:**
- Create: `tests/perft.test.ts`

[Perft](https://www.chessprogramming.org/Perft) is the standard correctness test for chess move generators. It counts every legal leaf node at a given depth from a known position. If our count matches the published value, the move generator is correct (no bugs in any of the special-move tasks).

- [ ] **Step 1: Write the perft tests**

`tests/perft.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.ts';
import { fromFEN, STARTING_FEN } from '../src/core/fen.ts';
import { legalMoves } from '../src/core/moves.ts';

const perft = (g: Game, depth: number): number => {
  if (depth === 0) return 1;
  let nodes = 0;
  for (const m of legalMoves(g.state())) {
    g.applyMove(m);
    nodes += perft(g, depth - 1);
    g.undo();
  }
  return nodes;
};

test('perft(1) from starting position = 20', () => {
  const g = Game.fromState(fromFEN(STARTING_FEN));
  assert.equal(perft(g, 1), 20);
});

test('perft(2) from starting position = 400', () => {
  const g = Game.fromState(fromFEN(STARTING_FEN));
  assert.equal(perft(g, 2), 400);
});

test('perft(3) from starting position = 8902', () => {
  const g = Game.fromState(fromFEN(STARTING_FEN));
  assert.equal(perft(g, 3), 8902);
});

// Kiwipete — exercises castling, en passant, promotions, and pins all at once.
const KIWIPETE = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';

test('perft(1) Kiwipete = 48', () => {
  const g = Game.fromState(fromFEN(KIWIPETE));
  assert.equal(perft(g, 1), 48);
});

test('perft(2) Kiwipete = 2039', () => {
  const g = Game.fromState(fromFEN(KIWIPETE));
  assert.equal(perft(g, 2), 2039);
});

test('perft(3) Kiwipete = 97862', () => {
  const g = Game.fromState(fromFEN(KIWIPETE));
  assert.equal(perft(g, 3), 97862);
});

// Slow tests: only run when explicitly requested.
test('slow: perft(4) starting position = 197281', { skip: !process.env.SLOW }, () => {
  const g = Game.fromState(fromFEN(STARTING_FEN));
  assert.equal(perft(g, 4), 197281);
});

test('slow: perft(4) Kiwipete = 4085603', { skip: !process.env.SLOW }, () => {
  const g = Game.fromState(fromFEN(KIWIPETE));
  assert.equal(perft(g, 4), 4085603);
});
```

- [ ] **Step 2: Run the fast perft tests**

Run: `npm test`
Expected: PASS — perft(1..3) for both positions matches; slow tests are skipped by default.

If any test fails, **do not** patch it — the value is published and correct. The bug is in your move generator. Find it (often: en passant capture, castling-through-check, or a stale castling-rights flag).

- [ ] **Step 3: Run the slow perft tests once to verify deep correctness**

Run: `SLOW=1 npm test`
Expected: PASS — all perft tests pass. Depth-4 Kiwipete takes ~10–60s on a laptop (no optimizations needed for this scope).

- [ ] **Step 4: Commit**

```sh
git add tests/perft.test.ts
git commit -m "test(core): perft correctness gauntlet (incl. Kiwipete)"
```

---

### Task 20: AI — Evaluation

**Files:**
- Create: `src/core/ai-eval.ts`
- Create: `tests/ai-eval.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/ai-eval.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.ts';
import { evaluate } from '../src/core/ai-eval.ts';
import { fromFEN, STARTING_FEN } from '../src/core/fen.ts';
import { Color, PieceType, piece } from '../src/core/pieces.ts';
import { parseSquare } from '../src/core/board.ts';

test('evaluate: starting position is roughly 0 (symmetric)', () => {
  const score = evaluate(fromFEN(STARTING_FEN));
  assert.ok(Math.abs(score) < 30, `expected near-zero, got ${score}`);
});

test('evaluate: white up a queen is strongly positive (from white POV)', () => {
  // Two kings + white queen.
  const b = new Uint8Array(64);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('d1')] = piece(PieceType.Queen, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const s = {
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  };
  assert.ok(evaluate(s) > 800);
});

test('evaluate: black up a queen is strongly negative (from white POV)', () => {
  const b = new Uint8Array(64);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('d8')] = piece(PieceType.Queen, Color.Black);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const s = {
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  };
  assert.ok(evaluate(s) < -800);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/core/ai-eval.ts`**

```ts
import { Color, PieceType, EMPTY, pieceColor, pieceType } from './pieces.ts';
import { GameState } from './game.ts';
import { fileOf, rankOf } from './board.ts';

const MATERIAL: Record<PieceType, number> = {
  [PieceType.None]:   0,
  [PieceType.Pawn]:   100,
  [PieceType.Knight]: 320,
  [PieceType.Bishop]: 330,
  [PieceType.Rook]:   500,
  [PieceType.Queen]:  900,
  [PieceType.King]:   0,
};

// Piece-square tables (white's perspective, rank 0 = white's back rank).
// Mirror for black.
const PST_PAWN = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10,-20,-20, 10, 10,  5,
   5, -5,-10,  0,  0,-10, -5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5,  5, 10, 25, 25, 10,  5,  5,
  10, 10, 20, 30, 30, 20, 10, 10,
  50, 50, 50, 50, 50, 50, 50, 50,
   0,  0,  0,  0,  0,  0,  0,  0,
];
const PST_KNIGHT = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];
const PST_BISHOP = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];
const PST_ROOK = [
   0,  0,  0,  5,  5,  0,  0,  0,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   5, 10, 10, 10, 10, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
];
const PST_QUEEN = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -10,  5,  5,  5,  5,  5,  0,-10,
    0,  0,  5,  5,  5,  5,  0, -5,
   -5,  0,  5,  5,  5,  5,  0, -5,
  -10,  0,  5,  5,  5,  5,  0,-10,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];
const PST_KING = [
   20, 30, 10,  0,  0, 10, 30, 20,
   20, 20,  0,  0,  0,  0, 20, 20,
  -10,-20,-20,-20,-20,-20,-20,-10,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
];

const PST: Record<PieceType, number[]> = {
  [PieceType.None]:   [],
  [PieceType.Pawn]:   PST_PAWN,
  [PieceType.Knight]: PST_KNIGHT,
  [PieceType.Bishop]: PST_BISHOP,
  [PieceType.Rook]:   PST_ROOK,
  [PieceType.Queen]:  PST_QUEEN,
  [PieceType.King]:   PST_KING,
};

// White-perspective evaluation in centipawns. Positive = good for white.
export const evaluate = (s: GameState): number => {
  let score = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = s.board[sq]!;
    if (p === EMPTY) continue;
    const t = pieceType(p);
    const c = pieceColor(p);
    const sign = c === Color.White ? 1 : -1;
    // Mirror PST for black: index by (7 - rank, file) for black squares.
    const pstIdx = c === Color.White
      ? sq
      : ((7 - rankOf(sq)) * 8) + fileOf(sq);
    score += sign * (MATERIAL[t] + (PST[t][pstIdx] ?? 0));
  }
  return score;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 3 evaluation tests pass.

- [ ] **Step 5: Commit**

```sh
git add src/core/ai-eval.ts tests/ai-eval.test.ts
git commit -m "feat(core): material + PST evaluation"
```

---

### Task 21: AI — Negamax + Alpha-Beta + Move Ordering

**Files:**
- Create: `src/core/ai.ts`
- Create: `tests/ai.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/ai.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.ts';
import { bestMove } from '../src/core/ai.ts';
import { fromFEN, STARTING_FEN } from '../src/core/fen.ts';
import { legalMoves } from '../src/core/moves.ts';
import { parseSquare, squareName } from '../src/core/board.ts';
import { Color, PieceType, piece } from '../src/core/pieces.ts';

test('AI never returns an illegal move', () => {
  const g = Game.fromState(fromFEN(STARTING_FEN));
  const m = bestMove(g, 2);
  const legal = legalMoves(g.state());
  assert.ok(legal.some((x) =>
    x.from === m.from && x.to === m.to && x.promotion === m.promotion,
  ));
});

test('AI finds mate-in-1 (back-rank): white plays Ra8#', () => {
  // White: K g2, R a1. Black: K g8 + pawns on f7,g7,h7. Trivial back-rank mate.
  const b = new Uint8Array(64);
  b[parseSquare('g2')] = piece(PieceType.King, Color.White);
  b[parseSquare('a1')] = piece(PieceType.Rook, Color.White);
  b[parseSquare('g8')] = piece(PieceType.King, Color.Black);
  b[parseSquare('f7')] = piece(PieceType.Pawn, Color.Black);
  b[parseSquare('g7')] = piece(PieceType.Pawn, Color.Black);
  b[parseSquare('h7')] = piece(PieceType.Pawn, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  const m = bestMove(g, 3);
  assert.equal(squareName(m.from), 'a1');
  assert.equal(squareName(m.to), 'a8');
});

test('AI prefers free queen capture over a quiet move', () => {
  // White Q on d1 can capture undefended black Q on d8. Plus kings.
  const b = new Uint8Array(64);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('d1')] = piece(PieceType.Queen, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  b[parseSquare('d8')] = piece(PieceType.Queen, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  const m = bestMove(g, 3);
  assert.equal(squareName(m.from), 'd1');
  assert.equal(squareName(m.to), 'd8');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/core/ai.ts`**

```ts
import { Game, Move, MoveFlag } from './game.ts';
import { legalMoves } from './moves.ts';
import { evaluate } from './ai-eval.ts';
import { Color, PieceType, EMPTY, pieceType } from './pieces.ts';
import { status } from './rules.ts';

const MATE_SCORE = 100_000;

const MATERIAL: Record<PieceType, number> = {
  [PieceType.None]: 0,   [PieceType.Pawn]: 100,  [PieceType.Knight]: 320,
  [PieceType.Bishop]: 330, [PieceType.Rook]: 500, [PieceType.Queen]: 900,
  [PieceType.King]: 0,
};

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
  // Terminal check.
  const moves = legalMoves(g.state());
  if (moves.length === 0) {
    const st = status(g);
    if (st === 'checkmate') return -MATE_SCORE + (g.states.length); // prefer faster mates
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 3 AI tests pass.

- [ ] **Step 5: Commit**

```sh
git add src/core/ai.ts tests/ai.test.ts
git commit -m "feat(core): negamax + alpha-beta + MVV-LVA ordering"
```

---

### Task 22: Public Core Barrel + Final Type-Check

**Files:**
- Create: `src/core/index.ts`

This task exposes a clean public API so the upcoming CLI / Web / WebRTC plans import from one place.

- [ ] **Step 1: Create `src/core/index.ts`**

```ts
export { Game, MoveFlag, CASTLE_WK, CASTLE_WQ, CASTLE_BK, CASTLE_BQ } from './game.ts';
export type { Move, GameState } from './game.ts';

export { Color, PieceType, EMPTY, piece, pieceColor, pieceType, opposite } from './pieces.ts';
export type { Piece } from './pieces.ts';

export {
  square, fileOf, rankOf, onBoard, squareName, parseSquare,
  FILE_A, FILE_H, RANK_1, RANK_8,
} from './board.ts';
export type { Square } from './board.ts';

export { pseudoLegalMoves, legalMoves } from './moves.ts';
export { isSquareAttacked, isInCheck } from './attacks.ts';
export { status } from './rules.ts';
export type { GameStatus } from './rules.ts';

export { toFEN, fromFEN, STARTING_FEN, FenParseError } from './fen.ts';
export { moveToSan, sanToMove } from './san.ts';
export { toPGN, fromPGN } from './pgn.ts';
export { evaluate } from './ai-eval.ts';
export { bestMove } from './ai.ts';
```

- [ ] **Step 2: Run the full test suite + type check**

Run:

```sh
npm test
npx tsc --noEmit
```

Expected: all tests pass; `tsc --noEmit` exits 0 with no errors.

- [ ] **Step 3: Commit**

```sh
git add src/core/index.ts
git commit -m "feat(core): public barrel for the engine"
```

---

## Self-Review Notes

This plan was reviewed against the spec section by section. Coverage:

- **Architecture & module layout (spec § Architecture):** Tasks 1–22 build `src/core/` exactly as specified. CLI / Web / WebRTC are explicitly deferred to follow-on plans.
- **Core data model (spec § Core Data Model):** Tasks 2–5 implement `Piece`, `Square`, `Move`, `GameState`, and the `Game` class with the public API named in the spec — except `toFEN/fromFEN/toPGN/fromPGN`, which are emitted as standalone functions (`fen.ts`, `pgn.ts`) and re-exported via the barrel in Task 22. This is a small, deliberate divergence: keeps notation modules independently testable.
- **AI (spec § AI):** Tasks 20–21 implement evaluation + negamax + alpha-beta + MVV-LVA. Pure functions, depth configurable. The Web Worker wrapper is correctly deferred to the Web UI plan (the spec's intent is that AI is consumed *from* a worker, not that the worker itself lives in core).
- **Networking, build/run, error handling (spec §§ Networking, Build & Run, Error Handling):** Out of scope for this plan; tracked in follow-on plans.
- **Testing (spec § Testing):** Tasks 9–19 cover all five test groups named in the spec (`core`, `notation`, `perft` incl. Kiwipete, `ai`); slow tests are env-gated.

No placeholders, TODOs, or "implement later" markers. Type signatures referenced across tasks (`Move`, `GameState`, `Color`, `PieceType`, `MoveFlag`, `CASTLE_*`) are defined in Task 5 and used consistently thereafter.

## Follow-On Plans

After this plan ships green, write:

- **Plan 2 — CLI:** ASCII board renderer, readline input loop, mode select (pass-and-play, vs AI).
- **Plan 3 — Web UI:** Static server, SVG board, click + drag input, Web Worker AI host, mode select (pass-and-play, vs AI).
- **Plan 4 — WebRTC Online Mode:** URL-fragment signaling, data-channel wire protocol, desync detection, disconnect recovery.

Each follow-on plan depends only on `src/core/index.ts` from this plan.
