import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Color, PieceType, EMPTY, piece } from '../src/core/pieces.ts';
import { parseSquare } from '../src/core/board.ts';
import { legalMoves } from '../src/core/moves.ts';
import { Game, MoveFlag } from '../src/core/game.ts';

test('en passant: appears as a legal capture when ep square is set', () => {
  // After 1.e4 d6 2.e5 f5 — white pawn on e5, black just played f7-f5.
  const b = new Uint8Array(64);
  b[parseSquare('e5')] = piece(PieceType.Pawn, Color.White);
  b[parseSquare('f5')] = piece(PieceType.Pawn, Color.Black);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const s = {
    board: b, turn: Color.White, castling: 0,
    enPassant: parseSquare('f6'),
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  };
  const epMove = legalMoves(s).find(
    (m) => m.from === parseSquare('e5') && m.to === parseSquare('f6'),
  );
  assert.ok(epMove, 'en passant move missing');
  assert.ok((epMove!.flags & MoveFlag.EnPassant) !== 0);
});

test('en passant: removes the passed pawn on apply', () => {
  const b = new Uint8Array(64);
  b[parseSquare('e5')] = piece(PieceType.Pawn, Color.White);
  b[parseSquare('f5')] = piece(PieceType.Pawn, Color.Black);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0,
    enPassant: parseSquare('f6'),
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  g.applyMove({
    from: parseSquare('e5'), to: parseSquare('f6'),
    flags: MoveFlag.EnPassant | MoveFlag.Capture,
  });
  assert.equal(g.state().board[parseSquare('f5')], EMPTY); // captured pawn gone
  assert.equal(g.state().board[parseSquare('f6')], piece(PieceType.Pawn, Color.White));
});

test('en passant: not generated when ep square is null', () => {
  const b = new Uint8Array(64);
  b[parseSquare('e5')] = piece(PieceType.Pawn, Color.White);
  b[parseSquare('f5')] = piece(PieceType.Pawn, Color.Black);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  const s = {
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  };
  const tos = legalMoves(s).filter((m) => m.from === parseSquare('e5')).map((m) => m.to);
  assert.ok(!tos.includes(parseSquare('f6')));
});
