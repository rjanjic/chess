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
