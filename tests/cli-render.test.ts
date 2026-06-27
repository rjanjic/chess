import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/index.ts';
import { renderBoard } from '../src/cli/render.ts';

describe('renderBoard', () => {
  it('has box-drawing top border', () => {
    const out = renderBoard(Game.newGame().state());
    assert.ok(out.includes('┌───┬───┬───┬───┬───┬───┬───┬───┐'));
  });

  it('has box-drawing bottom border', () => {
    const out = renderBoard(Game.newGame().state());
    assert.ok(out.includes('└───┴───┴───┴───┴───┴───┴───┴───┘'));
  });

  it('has file labels below the board', () => {
    const out = renderBoard(Game.newGame().state());
    assert.ok(out.includes('a   b   c   d   e   f   g   h'));
  });

  it('shows white back-rank pieces in rank 1', () => {
    const out = renderBoard(Game.newGame().state());
    const lines = out.split('\n');
    const rank1 = lines.find(l => l.startsWith('1 │'))!;
    assert.ok(rank1.includes('♖'), 'white rook');
    assert.ok(rank1.includes('♘'), 'white knight');
    assert.ok(rank1.includes('♗'), 'white bishop');
    assert.ok(rank1.includes('♕'), 'white queen');
    assert.ok(rank1.includes('♔'), 'white king');
    assert.ok(rank1.endsWith('│ 1'), 'rank label on right');
  });

  it('shows black back-rank pieces in rank 8', () => {
    const out = renderBoard(Game.newGame().state());
    const lines = out.split('\n');
    const rank8 = lines.find(l => l.startsWith('8 │'))!;
    assert.ok(rank8.includes('♜'), 'black rook');
    assert.ok(rank8.includes('♞'), 'black knight');
    assert.ok(rank8.includes('♝'), 'black bishop');
    assert.ok(rank8.includes('♛'), 'black queen');
    assert.ok(rank8.includes('♚'), 'black king');
    assert.ok(rank8.endsWith('│ 8'), 'rank label on right');
  });

  it('marks dark empty squares with middle-dot', () => {
    const out = renderBoard(Game.newGame().state());
    const lines = out.split('\n');
    const rank3 = lines.find(l => l.startsWith('3 │'))!;
    // a3: file=0, rank=2 → (0+2)%2=0 → dark → ·
    assert.ok(rank3.startsWith('3 │ · │'), 'a3 is dark');
    const rank6 = lines.find(l => l.startsWith('6 │'))!;
    // a6: file=0, rank=5 → (0+5)%2=1 → light → space
    assert.ok(rank6.startsWith('6 │   │'), 'a6 is light');
  });

  it('has no ASCII piece letters', () => {
    const out = renderBoard(Game.newGame().state());
    assert.doesNotMatch(out, /[PNBRQK]/);
  });

  it('shows white pawns in rank 2', () => {
    const out = renderBoard(Game.newGame().state());
    const lines = out.split('\n');
    const rank2 = lines.find(l => l.startsWith('2 │'))!;
    assert.ok(rank2.includes('♙'), 'white pawn');
  });

  it('shows black pawns in rank 7', () => {
    const out = renderBoard(Game.newGame().state());
    const lines = out.split('\n');
    const rank7 = lines.find(l => l.startsWith('7 │'))!;
    assert.ok(rank7.includes('♟'), 'black pawn');
  });

  it('has exactly 7 separator lines between ranks', () => {
    const out = renderBoard(Game.newGame().state());
    const seps = out.split('\n').filter(l => l.startsWith('  ├'));
    assert.strictEqual(seps.length, 7);
  });
});
