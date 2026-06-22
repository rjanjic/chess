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

test('fromPGN skips NAG annotation tokens', () => {
  const pgn = '1. e4 $1 e5 $2 *';
  const g = fromPGN(pgn);
  assert.equal(g.moves.length, 2);
});

test('fromPGN handles nested parenthetical variations', () => {
  const pgn = '1. e4 (1. d4 (1. c4 c5)) e5 *';
  const g = fromPGN(pgn);
  assert.equal(g.moves.length, 2);
});
