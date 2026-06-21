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
