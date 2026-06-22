import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderBoard } from '../src/cli/render.ts';
import { fromFEN, STARTING_FEN, Game } from '../src/core/index.ts';
import { sanToMove } from '../src/core/index.ts';

test('renderBoard: starting position has correct shape and labels', () => {
  const lines = renderBoard(fromFEN(STARTING_FEN)).split('\n');
  assert.equal(lines.length, 10);
  assert.equal(lines[0], '  a b c d e f g h');
  assert.equal(lines[9], '  a b c d e f g h');
  // line[1] = rank 8 (black back rank)
  assert.equal(lines[1], '8 r n b q k b n r 8');
  // line[8] = rank 1 (white back rank)
  assert.equal(lines[8], '1 R N B Q K B N R 1');
});

test('renderBoard: rank 7 is all black pawns at start', () => {
  const lines = renderBoard(fromFEN(STARTING_FEN)).split('\n');
  assert.equal(lines[2], '7 p p p p p p p p 7');
});

test('renderBoard: rank 2 is all white pawns at start', () => {
  const lines = renderBoard(fromFEN(STARTING_FEN)).split('\n');
  assert.equal(lines[7], '2 P P P P P P P P 2');
});

test('renderBoard: empty ranks 3-6 are all dots', () => {
  const lines = renderBoard(fromFEN(STARTING_FEN)).split('\n');
  // line[3]=rank6, line[4]=rank5, line[5]=rank4, line[6]=rank3
  for (const i of [3, 4, 5, 6]) {
    assert.match(lines[i]!, /^\d \. \. \. \. \. \. \. \. \d$/);
  }
});

test('renderBoard: after 1.e4, rank 4 shows white pawn on e-file', () => {
  const g = Game.newGame();
  g.applyMove(sanToMove(g, 'e4'));
  const lines = renderBoard(g.state()).split('\n');
  // e4 = rank 4, file e (index 4). line[5] = rank 4.
  assert.equal(lines[5], '4 . . . . P . . . 4');
});
