import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Color, PieceType, piece } from '../src/core/pieces.ts';
import { parseSquare } from '../src/core/board.ts';
import { status } from '../src/core/rules.ts';
import { Game } from '../src/core/game.ts';

test('draw-material: K vs K', () => {
  const b = new Uint8Array(64);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  assert.equal(status(g), 'draw-material');
});

test('draw-material: K+B vs K', () => {
  const b = new Uint8Array(64);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('f1')] = piece(PieceType.Bishop, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  assert.equal(status(g), 'draw-material');
});

test('draw-material: K+N vs K', () => {
  const b = new Uint8Array(64);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('f1')] = piece(PieceType.Knight, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  assert.equal(status(g), 'draw-material');
});

test('not draw-material: K+R vs K', () => {
  const b = new Uint8Array(64);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('a1')] = piece(PieceType.Rook, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  assert.equal(status(g), 'ongoing');
});

test('draw-50: halfmove clock at 100 triggers 50-move rule', () => {
  const b = new Uint8Array(64);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('a1')] = piece(PieceType.Rook, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 100, fullmoveNumber: 60, zobrist: 0n,
  });
  assert.equal(status(g), 'draw-50');
});

test('draw-repetition: same position three times', () => {
  const g = Game.newGame();
  // Repeat a knight shuffle three times: Nf3 Nf6 Ng1 Ng8 Nf3 Nf6 Ng1 Ng8.
  // After move 1 the start position has been seen once (initial).
  const seq: [string, string, number][] = [
    ['g1','f3',0], ['g8','f6',0], ['f3','g1',0], ['f6','g8',0],
    ['g1','f3',0], ['g8','f6',0], ['f3','g1',0], ['f6','g8',0],
  ];
  for (const [from, to, flags] of seq) {
    g.applyMove({ from: parseSquare(from), to: parseSquare(to), flags });
  }
  assert.equal(status(g), 'draw-repetition');
});
