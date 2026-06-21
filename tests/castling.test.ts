import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Color, PieceType, EMPTY, piece } from '../src/core/pieces.ts';
import { parseSquare } from '../src/core/board.ts';
import { legalMoves } from '../src/core/moves.ts';
import { Game, MoveFlag, CASTLE_WK, CASTLE_WQ, CASTLE_BK, CASTLE_BQ } from '../src/core/game.ts';

const baseCastleState = (extra: (b: Uint8Array) => void = () => {}) => {
  const b = new Uint8Array(64);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('a1')] = piece(PieceType.Rook, Color.White);
  b[parseSquare('h1')] = piece(PieceType.Rook, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  extra(b);
  return {
    board: b, turn: Color.White,
    castling: CASTLE_WK | CASTLE_WQ | CASTLE_BK | CASTLE_BQ,
    enPassant: null, halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  };
};

test('castling: both kingside and queenside available when path clear', () => {
  const s = baseCastleState();
  const ms = legalMoves(s).filter((m) => m.from === parseSquare('e1'));
  const tos = ms.map((m) => m.to);
  assert.ok(tos.includes(parseSquare('g1')), 'kingside available');
  assert.ok(tos.includes(parseSquare('c1')), 'queenside available');
});

test('castling: blocked when piece between king and rook', () => {
  const s = baseCastleState((b) => {
    b[parseSquare('f1')] = piece(PieceType.Knight, Color.White);
  });
  const tos = legalMoves(s).filter((m) => m.from === parseSquare('e1')).map((m) => m.to);
  assert.ok(!tos.includes(parseSquare('g1')));
  assert.ok(tos.includes(parseSquare('c1')));
});

test('castling: forbidden when king is in check', () => {
  const s = baseCastleState((b) => {
    b[parseSquare('e5')] = piece(PieceType.Rook, Color.Black); // checks king on e1
  });
  const tos = legalMoves(s).filter((m) => m.from === parseSquare('e1')).map((m) => m.to);
  assert.ok(!tos.includes(parseSquare('g1')));
  assert.ok(!tos.includes(parseSquare('c1')));
});

test('castling: forbidden when king passes through attacked square', () => {
  const s = baseCastleState((b) => {
    b[parseSquare('f5')] = piece(PieceType.Rook, Color.Black); // attacks f1
  });
  const tos = legalMoves(s).filter((m) => m.from === parseSquare('e1')).map((m) => m.to);
  assert.ok(!tos.includes(parseSquare('g1'))); // king crosses f1
  assert.ok(tos.includes(parseSquare('c1')));  // queenside path d1/c1 not attacked
});

test('castling: forbidden when castling right is missing', () => {
  const s = { ...baseCastleState(), castling: CASTLE_BK | CASTLE_BQ };
  const tos = legalMoves(s).filter((m) => m.from === parseSquare('e1')).map((m) => m.to);
  assert.ok(!tos.includes(parseSquare('g1')));
  assert.ok(!tos.includes(parseSquare('c1')));
});

test('apply castling: king and rook both move; castling rights revoked', () => {
  const g = Game.fromState(baseCastleState());
  g.applyMove({ from: parseSquare('e1'), to: parseSquare('g1'), flags: MoveFlag.Castle });
  const s = g.state();
  assert.equal(s.board[parseSquare('e1')], EMPTY);
  assert.equal(s.board[parseSquare('h1')], EMPTY);
  assert.equal(s.board[parseSquare('g1')], piece(PieceType.King, Color.White));
  assert.equal(s.board[parseSquare('f1')], piece(PieceType.Rook, Color.White));
  assert.equal(s.castling, CASTLE_BK | CASTLE_BQ);
});
