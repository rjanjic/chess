import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Color, PieceType, piece } from '../src/core/pieces.ts';
import { parseSquare } from '../src/core/board.ts';
import { status } from '../src/core/rules.ts';
import { Game } from '../src/core/game.ts';

test('status: ongoing in start position', () => {
  assert.equal(status(Game.newGame()), 'ongoing');
});

test("status: fool's mate is checkmate (black wins)", () => {
  // 1. f3 e5  2. g4 Qh4#
  const g = Game.newGame();
  g.applyMove({ from: parseSquare('f2'), to: parseSquare('f3'), flags: 0 });
  g.applyMove({ from: parseSquare('e7'), to: parseSquare('e5'), flags: 8 /* DoublePush */ });
  g.applyMove({ from: parseSquare('g2'), to: parseSquare('g4'), flags: 8 });
  g.applyMove({ from: parseSquare('d8'), to: parseSquare('h4'), flags: 0 });
  assert.equal(status(g), 'checkmate');
});

test('status: stalemate (classic king + pawn vs king)', () => {
  // Black king on a8, white king on b6, white pawn on a7. Black to move, no legal moves, not in check.
  const b = new Uint8Array(64);
  b[parseSquare('a8')] = piece(PieceType.King, Color.Black);
  b[parseSquare('b6')] = piece(PieceType.King, Color.White);
  b[parseSquare('a7')] = piece(PieceType.Pawn, Color.White);
  const g = Game.fromState({
    board: b, turn: Color.Black, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  assert.equal(status(g), 'stalemate');
});
