import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Color, PieceType, piece } from '../src/core/pieces.ts';
import { parseSquare } from '../src/core/board.ts';
import { isSquareAttacked, isInCheck } from '../src/core/attacks.ts';
import { legalMoves } from '../src/core/moves.ts';
import { Game } from '../src/core/game.ts';

const stateOf = (setup: (b: Uint8Array) => void, turn: Color = Color.White) => {
  const b = new Uint8Array(64);
  setup(b);
  return {
    board: b, turn, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  };
};

test('isSquareAttacked: knight attack', () => {
  const s = stateOf((b) => {
    b[parseSquare('e4')] = piece(PieceType.Knight, Color.Black);
  });
  assert.equal(isSquareAttacked(s.board, parseSquare('f6'), Color.Black), true);
  assert.equal(isSquareAttacked(s.board, parseSquare('e5'), Color.Black), false);
});

test('isSquareAttacked: bishop blocked by piece', () => {
  const s = stateOf((b) => {
    b[parseSquare('a1')] = piece(PieceType.Bishop, Color.Black);
    b[parseSquare('c3')] = piece(PieceType.Pawn, Color.White); // blocker
  });
  assert.equal(isSquareAttacked(s.board, parseSquare('b2'), Color.Black), true);
  assert.equal(isSquareAttacked(s.board, parseSquare('h8'), Color.Black), false);
});

test('isSquareAttacked: pawn attacks diagonals only', () => {
  const s = stateOf((b) => {
    b[parseSquare('e4')] = piece(PieceType.Pawn, Color.White);
  });
  assert.equal(isSquareAttacked(s.board, parseSquare('d5'), Color.White), true);
  assert.equal(isSquareAttacked(s.board, parseSquare('f5'), Color.White), true);
  assert.equal(isSquareAttacked(s.board, parseSquare('e5'), Color.White), false);
});

test('legalMoves filters out pinned-piece moves that expose the king', () => {
  // White king on e1, white rook on e2 (pinned), black rook on e8.
  const s = stateOf((b) => {
    b[parseSquare('e1')] = piece(PieceType.King, Color.White);
    b[parseSquare('e2')] = piece(PieceType.Rook, Color.White);
    b[parseSquare('e8')] = piece(PieceType.Rook, Color.Black);
  });
  const moves = legalMoves(s);
  // The pinned rook can move along the e-file but not off it.
  const rookMoves = moves.filter((m) => m.from === parseSquare('e2'));
  for (const m of rookMoves) {
    // file part of `to` must equal file of e2 (file index 4)
    assert.equal(m.to & 7, 4, `pinned rook should stay on e-file, got ${m.to}`);
  }
  // The king has one legal move (d1 / f1), no e-file moves.
  const kingMoves = moves.filter((m) => m.from === parseSquare('e1'));
  for (const m of kingMoves) {
    assert.notEqual(m.to & 7, 4);
  }
});

test('isInCheck: detects check from new game (false)', () => {
  assert.equal(isInCheck(Game.newGame().state()), false);
});
