import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, CASTLE_WK, CASTLE_WQ, CASTLE_BK, CASTLE_BQ } from '../src/core/game.ts';
import { Color, PieceType, piece, EMPTY } from '../src/core/pieces.ts';
import { square } from '../src/core/board.ts';

test('newGame: starting position has correct piece placement', () => {
  const g = Game.newGame();
  const s = g.state();

  // White back rank
  assert.equal(s.board[square(0, 0)], piece(PieceType.Rook, Color.White));
  assert.equal(s.board[square(4, 0)], piece(PieceType.King, Color.White));
  // White pawns
  for (let f = 0; f < 8; f++) {
    assert.equal(s.board[square(f, 1)], piece(PieceType.Pawn, Color.White));
  }
  // Middle four ranks are empty
  for (let r = 2; r <= 5; r++) {
    for (let f = 0; f < 8; f++) {
      assert.equal(s.board[square(f, r)], EMPTY);
    }
  }
  // Black pawns / back rank
  for (let f = 0; f < 8; f++) {
    assert.equal(s.board[square(f, 6)], piece(PieceType.Pawn, Color.Black));
  }
  assert.equal(s.board[square(4, 7)], piece(PieceType.King, Color.Black));
});

test('newGame: white to move, full castling rights, no ep, clocks reset', () => {
  const s = Game.newGame().state();
  assert.equal(s.turn, Color.White);
  assert.equal(s.castling, CASTLE_WK | CASTLE_WQ | CASTLE_BK | CASTLE_BQ);
  assert.equal(s.enPassant, null);
  assert.equal(s.halfmoveClock, 0);
  assert.equal(s.fullmoveNumber, 1);
});

test('newGame: zobrist hash is non-zero and stable', () => {
  const a = Game.newGame().state().zobrist;
  const b = Game.newGame().state().zobrist;
  assert.equal(a, b);
  assert.notEqual(a, 0n);
});
