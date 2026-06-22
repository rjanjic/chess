import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMove } from '../src/cli/input.ts';
import { Game, PieceType, Color, piece, CASTLE_WK } from '../src/core/index.ts';
import { squareName, parseSquare } from '../src/core/index.ts';
import type { GameState } from '../src/core/index.ts';

test('parseMove: SAN "e4" from starting position', () => {
  const g = Game.newGame();
  const m = parseMove(g, 'e4');
  assert.equal(squareName(m.from), 'e2');
  assert.equal(squareName(m.to), 'e4');
});

test('parseMove: coordinate "e2e4" from starting position', () => {
  const g = Game.newGame();
  const m = parseMove(g, 'e2e4');
  assert.equal(squareName(m.from), 'e2');
  assert.equal(squareName(m.to), 'e4');
});

test('parseMove: coordinate notation with promotion "e7e8q"', () => {
  // White: Ke1, Pe7; Black: Kh8. Pawn can push to e8 and promote.
  const b = new Uint8Array(64);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('e7')] = piece(PieceType.Pawn, Color.White);
  b[parseSquare('h8')] = piece(PieceType.King, Color.Black);
  const state: GameState = {
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  };
  const m = parseMove(Game.fromState(state), 'e7e8q');
  assert.equal(squareName(m.to), 'e8');
  assert.equal(m.promotion, PieceType.Queen);
});

test('parseMove: SAN castling "O-O"', () => {
  // White: Ke1, Rh1; Black: Ke8. No pieces between king and rook.
  const b = new Uint8Array(64);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('h1')] = piece(PieceType.Rook, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const state: GameState = {
    board: b, turn: Color.White, castling: CASTLE_WK, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  };
  const m = parseMove(Game.fromState(state), 'O-O');
  assert.equal(squareName(m.from), 'e1');
  assert.equal(squareName(m.to), 'g1');
});

test('parseMove: throws on move not reachable in one step', () => {
  const g = Game.newGame();
  assert.throws(() => parseMove(g, 'e5'), /Unrecognized move/);
});

test('parseMove: throws on garbage input', () => {
  const g = Game.newGame();
  assert.throws(() => parseMove(g, 'xyz123'), /Unrecognized move/);
});
