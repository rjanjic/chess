import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../src/core/ai-eval.ts';
import { fromFEN, STARTING_FEN } from '../src/core/fen.ts';
import { Color, PieceType, piece } from '../src/core/pieces.ts';
import { parseSquare } from '../src/core/board.ts';
import type { GameState } from '../src/core/game.ts';

test('evaluate: starting position is roughly 0 (symmetric)', () => {
  const score = evaluate(fromFEN(STARTING_FEN));
  assert.ok(Math.abs(score) < 30, `expected near-zero, got ${score}`);
});

test('evaluate: white up a queen is strongly positive (from white POV)', () => {
  // Two kings + white queen.
  const b = new Uint8Array(64);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('d1')] = piece(PieceType.Queen, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const s: GameState = {
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  };
  assert.ok(evaluate(s) > 800);
});

test('evaluate: black up a queen is strongly negative (from white POV)', () => {
  const b = new Uint8Array(64);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('d8')] = piece(PieceType.Queen, Color.Black);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const s: GameState = {
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  };
  assert.ok(evaluate(s) < -800);
});
