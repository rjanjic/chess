import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, MoveFlag } from '../src/core/game.ts';
import { Color, PieceType, EMPTY, piece } from '../src/core/pieces.ts';
import { parseSquare, square } from '../src/core/board.ts';

test('apply: e2-e4 advances board, flips turn, sets ep', () => {
  const g = Game.newGame();
  const e2 = parseSquare('e2'), e4 = parseSquare('e4'), e3 = parseSquare('e3');
  g.applyMove({ from: e2, to: e4, flags: MoveFlag.DoublePush });
  const s = g.state();
  assert.equal(s.board[e2], EMPTY);
  assert.equal(s.board[e4], piece(PieceType.Pawn, Color.White));
  assert.equal(s.turn, Color.Black);
  assert.equal(s.enPassant, e3);
  assert.equal(s.halfmoveClock, 0);  // pawn move resets
  assert.equal(s.fullmoveNumber, 1);
});

test('apply: a knight move increments halfmove clock', () => {
  const g = Game.newGame();
  g.applyMove({ from: parseSquare('g1'), to: parseSquare('f3'), flags: 0 });
  assert.equal(g.state().halfmoveClock, 1);
});

test('apply: black move increments fullmove number', () => {
  const g = Game.newGame();
  g.applyMove({ from: parseSquare('e2'), to: parseSquare('e4'), flags: MoveFlag.DoublePush });
  g.applyMove({ from: parseSquare('e7'), to: parseSquare('e5'), flags: MoveFlag.DoublePush });
  assert.equal(g.state().fullmoveNumber, 2);
});

test('apply: capture resets halfmove clock and removes captured piece', () => {
  const g = Game.newGame();
  g.applyMove({ from: parseSquare('e2'), to: parseSquare('e4'), flags: MoveFlag.DoublePush });
  g.applyMove({ from: parseSquare('d7'), to: parseSquare('d5'), flags: MoveFlag.DoublePush });
  g.applyMove({ from: parseSquare('e4'), to: parseSquare('d5'), flags: MoveFlag.Capture });
  const s = g.state();
  assert.equal(s.board[parseSquare('d5')], piece(PieceType.Pawn, Color.White));
  assert.equal(s.halfmoveClock, 0);
});

test('apply: moving king clears both castling rights for that color', () => {
  // Hand-craft a position where white king has only one quiet move.
  const b = new Uint8Array(64);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0b1111,
    enPassant: null, halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  g.applyMove({ from: parseSquare('e1'), to: parseSquare('e2'), flags: 0 });
  // White castling bits (low two) cleared, black bits (high two) preserved.
  assert.equal(g.state().castling, 0b1100);
});

test('apply: moving rook from a1 clears WQ only', () => {
  const b = new Uint8Array(64);
  b[parseSquare('a1')] = piece(PieceType.Rook, Color.White);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0b1111,
    enPassant: null, halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  g.applyMove({ from: parseSquare('a1'), to: parseSquare('a4'), flags: 0 });
  assert.equal(g.state().castling, 0b1101); // WQ (bit 1) cleared
});

test('undo: state, history, and zobrist all restored', () => {
  const g = Game.newGame();
  const z0 = g.state().zobrist;
  g.applyMove({ from: parseSquare('e2'), to: parseSquare('e4'), flags: MoveFlag.DoublePush });
  g.undo();
  assert.equal(g.state().zobrist, z0);
  assert.equal(g.state().turn, Color.White);
  assert.equal(g.states.length, 1);
  assert.equal(g.moves.length, 0);
});
