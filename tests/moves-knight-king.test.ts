import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Color, PieceType, EMPTY, piece } from '../src/core/pieces.ts';
import { square, squareName } from '../src/core/board.ts';
import { pseudoLegalMoves } from '../src/core/moves.ts';
import { Game } from '../src/core/game.ts';

const emptyBoard = (): Uint8Array => new Uint8Array(64);

const stateWith = (
  setup: (b: Uint8Array) => void,
  turn: Color = Color.White,
) => {
  const b = emptyBoard();
  setup(b);
  return {
    board: b, turn, castling: 0, enPassant: null,
    halfmoveClock: 0, fullmoveNumber: 1, zobrist: 0n,
  };
};

const targets = (moves: { from: number; to: number }[], from: number) =>
  moves.filter((m) => m.from === from).map((m) => squareName(m.to)).sort();

test('knight in center has 8 moves', () => {
  const s = stateWith((b) => {
    b[square(4, 4)] = piece(PieceType.Knight, Color.White); // e5
  });
  const ts = targets(pseudoLegalMoves(s), square(4, 4));
  assert.deepEqual(ts, ['c4', 'c6', 'd3', 'd7', 'f3', 'f7', 'g4', 'g6'].sort());
});

test('knight in corner has 2 moves', () => {
  const s = stateWith((b) => {
    b[square(0, 0)] = piece(PieceType.Knight, Color.White); // a1
  });
  const ts = targets(pseudoLegalMoves(s), square(0, 0));
  assert.deepEqual(ts, ['b3', 'c2'].sort());
});

test('knight does not capture own piece', () => {
  const s = stateWith((b) => {
    b[square(4, 4)] = piece(PieceType.Knight, Color.White);
    b[square(5, 6)] = piece(PieceType.Pawn, Color.White); // f7 blocked
  });
  const ts = targets(pseudoLegalMoves(s), square(4, 4));
  assert.ok(!ts.includes('f7'));
});

test('knight captures enemy piece', () => {
  const s = stateWith((b) => {
    b[square(4, 4)] = piece(PieceType.Knight, Color.White);
    b[square(5, 6)] = piece(PieceType.Pawn, Color.Black);
  });
  const ts = targets(pseudoLegalMoves(s), square(4, 4));
  assert.ok(ts.includes('f7'));
});

test('king in center has 8 moves', () => {
  const s = stateWith((b) => {
    b[square(4, 4)] = piece(PieceType.King, Color.White);
  });
  const ts = targets(pseudoLegalMoves(s), square(4, 4));
  assert.deepEqual(ts, ['d4', 'd5', 'd6', 'e4', 'e6', 'f4', 'f5', 'f6'].sort());
});

test('only own-color pieces generate moves', () => {
  const s = stateWith((b) => {
    b[square(4, 4)] = piece(PieceType.Knight, Color.Black);
  }, Color.White);
  assert.equal(pseudoLegalMoves(s).length, 0);
});
