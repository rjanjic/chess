import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Game, parseSquare } from '../src/core/index.ts';
import { boardToSVG, sqFromPoint } from '../src/web/render.ts';

describe('boardToSVG', () => {
  it('produces exactly 64 background rect elements', () => {
    const state = Game.newGame().state();
    const svg = boardToSVG(state, null, [], false);
    assert.strictEqual((svg.match(/<rect/g) ?? []).length, 64);
  });

  it('includes white and black piece characters', () => {
    const state = Game.newGame().state();
    const svg = boardToSVG(state, null, [], false);
    assert.ok(svg.includes('♙'), 'white pawn ♙');
    assert.ok(svg.includes('♟'), 'black pawn ♟');
  });

  it('adds a second rect for selected square', () => {
    const state = Game.newGame().state();
    const svg = boardToSVG(state, parseSquare('a2'), [], false);
    assert.strictEqual((svg.match(/<rect/g) ?? []).length, 65);
  });

  it('adds a dot circle for an empty legal target', () => {
    const state = Game.newGame().state();
    const svg = boardToSVG(state, null, [parseSquare('e4')], false);
    assert.ok(svg.includes('<circle'), 'should include dot for legal move target');
  });
});

describe('sqFromPoint', () => {
  it('maps (0,0) to a8 when not flipped', () => {
    assert.strictEqual(sqFromPoint(0, 0, false), parseSquare('a8'));
  });

  it('maps (0,0) to h1 when flipped', () => {
    assert.strictEqual(sqFromPoint(0, 0, true), parseSquare('h1'));
  });

  it('maps (448, 448) to h1 when not flipped', () => {
    assert.strictEqual(sqFromPoint(448, 448, false), parseSquare('h1'));
  });
});
