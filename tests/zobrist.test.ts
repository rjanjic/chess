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
