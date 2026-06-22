import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.ts';
import { bestMove } from '../src/core/ai.ts';
import { fromFEN, STARTING_FEN } from '../src/core/fen.ts';
import { legalMoves } from '../src/core/moves.ts';
import { parseSquare, squareName } from '../src/core/board.ts';
import { Color, PieceType, piece } from '../src/core/pieces.ts';

test('AI never returns an illegal move', () => {
  const g = Game.fromState(fromFEN(STARTING_FEN));
  const m = bestMove(g, 2);
  const legal = legalMoves(g.state());
  assert.ok(legal.some((x) =>
    x.from === m.from && x.to === m.to && x.promotion === m.promotion,
  ));
});

test('AI finds mate-in-1 (back-rank): white plays Ra8#', () => {
  // White: K g2, R a1. Black: K g8 + pawns on f7,g7,h7. Trivial back-rank mate.
  const b = new Uint8Array(64);
  b[parseSquare('g2')] = piece(PieceType.King, Color.White);
  b[parseSquare('a1')] = piece(PieceType.Rook, Color.White);
  b[parseSquare('g8')] = piece(PieceType.King, Color.Black);
  b[parseSquare('f7')] = piece(PieceType.Pawn, Color.Black);
  b[parseSquare('g7')] = piece(PieceType.Pawn, Color.Black);
  b[parseSquare('h7')] = piece(PieceType.Pawn, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  const m = bestMove(g, 3);
  assert.equal(squareName(m.from), 'a1');
  assert.equal(squareName(m.to), 'a8');
});

test('AI prefers free queen capture over a quiet move', () => {
  // White Q on d1 can capture undefended black Q on d8. Plus kings.
  const b = new Uint8Array(64);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('d1')] = piece(PieceType.Queen, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  b[parseSquare('d8')] = piece(PieceType.Queen, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  const m = bestMove(g, 3);
  assert.equal(squareName(m.from), 'd1');
  assert.equal(squareName(m.to), 'd8');
});
