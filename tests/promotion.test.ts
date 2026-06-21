import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Color, PieceType, EMPTY, piece } from '../src/core/pieces.ts';
import { parseSquare } from '../src/core/board.ts';
import { legalMoves } from '../src/core/moves.ts';
import { Game, MoveFlag } from '../src/core/game.ts';

test('white pawn on 7th: four promotion moves per target square', () => {
  const b = new Uint8Array(64);
  b[parseSquare('e7')] = piece(PieceType.Pawn, Color.White);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('e8')] = piece(PieceType.King, Color.Black);
  // Place black king elsewhere so target e8 is occupied by king — pick a8.
  b[parseSquare('e8')] = 0;
  b[parseSquare('a8')] = piece(PieceType.King, Color.Black);
  const s = {
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  };
  const promos = legalMoves(s).filter((m) => m.from === parseSquare('e7'));
  const promoTypes = promos
    .filter((m) => m.to === parseSquare('e8'))
    .map((m) => m.promotion)
    .sort();
  assert.deepEqual(promoTypes, [
    PieceType.Bishop, PieceType.Knight, PieceType.Queen, PieceType.Rook,
  ].sort());
  for (const m of promos) {
    assert.ok((m.flags & MoveFlag.Promotion) !== 0);
  }
});

test('apply promotion: replaces pawn with chosen piece', () => {
  const b = new Uint8Array(64);
  b[parseSquare('e7')] = piece(PieceType.Pawn, Color.White);
  b[parseSquare('e1')] = piece(PieceType.King, Color.White);
  b[parseSquare('a8')] = piece(PieceType.King, Color.Black);
  const g = Game.fromState({
    board: b, turn: Color.White, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  });
  g.applyMove({
    from: parseSquare('e7'), to: parseSquare('e8'),
    promotion: PieceType.Queen, flags: MoveFlag.Promotion,
  });
  assert.equal(g.state().board[parseSquare('e8')], piece(PieceType.Queen, Color.White));
});
