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
