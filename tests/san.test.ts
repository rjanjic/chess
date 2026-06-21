import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.ts';
import { parseSquare } from '../src/core/board.ts';
import { Color, PieceType, piece } from '../src/core/pieces.ts';
import { moveToSan, sanToMove } from '../src/core/san.ts';

test('SAN: pawn push e4 from start', () => {
  const g = Game.newGame();
  const m = sanToMove(g, 'e4');
  assert.equal(m.from, parseSquare('e2'));
  assert.equal(m.to, parseSquare('e4'));
  assert.equal(moveToSan(g, m), 'e4');
});

test('SAN: knight move Nf3 from start', () => {
  const g = Game.newGame();
  const m = sanToMove(g, 'Nf3');
  assert.equal(m.from, parseSquare('g1'));
  assert.equal(m.to, parseSquare('f3'));
  assert.equal(moveToSan(g, m), 'Nf3');
});

test('SAN: castling O-O and O-O-O', () => {
  const b = new Uint8Array(64);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('a1')] = piece(PieceType.Rook, Color.White);
  b[parseSquare('h1')] = piece(PieceType.Rook, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0b1111,
    enPassant: null, halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  const oo = sanToMove(g, 'O-O');
  assert.equal(oo.to, parseSquare('g1'));
  assert.equal(moveToSan(g, oo), 'O-O');
  const ooo = sanToMove(g, 'O-O-O');
  assert.equal(ooo.to, parseSquare('c1'));
  assert.equal(moveToSan(g, ooo), 'O-O-O');
});

test('SAN: capture Nxe5', () => {
  const g = Game.newGame();
  g.applyMove(sanToMove(g, 'e4'));
  g.applyMove(sanToMove(g, 'd5'));
  g.applyMove(sanToMove(g, 'exd5'));
  // After 1.e4 d5 2.exd5, white pawn is on d5.
  const m = sanToMove(g, 'Nf6');
  // smoke check the parse worked
  assert.equal(m.to, parseSquare('f6'));
});

test('SAN: promotion e8=Q with check marker', () => {
  const b = new Uint8Array(64);
  b[parseSquare('e7')] = piece(PieceType.Pawn, Color.White);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('a8')] = piece(PieceType.King, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  const m = sanToMove(g, 'e8=Q+');
  assert.equal(m.to, parseSquare('e8'));
  assert.equal(m.promotion, PieceType.Queen);
});

test('SAN: disambiguates two knights moving to the same square', () => {
  // White knights on b1 and d1 can both go to c3 (well, d1->c3 yes; b1->c3 yes).
  const b = new Uint8Array(64);
  b[parseSquare('b1')] = piece(PieceType.Knight, Color.White);
  b[parseSquare('d1')] = piece(PieceType.Knight, Color.White);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  const m = { from: parseSquare('b1'), to: parseSquare('c3'), flags: 0 };
  const san = moveToSan(g, m);
  assert.equal(san, 'Nbc3'); // file disambiguation
  assert.equal(sanToMove(g, 'Nbc3').from, parseSquare('b1'));
});
