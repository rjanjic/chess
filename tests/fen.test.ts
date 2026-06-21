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
