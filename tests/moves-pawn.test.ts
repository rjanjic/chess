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
