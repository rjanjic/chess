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
test('slow: perft(4) starting position = 197281', { skip: !process.env['SLOW'] }, () => {
  const g = Game.fromState(fromFEN(STARTING_FEN));
  assert.equal(perft(g, 4), 197281);
});

test('slow: perft(4) Kiwipete = 4085603', { skip: !process.env['SLOW'] }, () => {
  const g = Game.fromState(fromFEN(KIWIPETE));
  assert.equal(perft(g, 4), 4085603);
});
