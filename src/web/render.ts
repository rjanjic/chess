import { pieceColor, pieceType, isEmpty } from '../core/index.ts';
import type { GameState } from '../core/index.ts';
import type { Square } from '../core/index.ts';

const LIGHT = '#f0d9b5';
const DARK  = '#b58863';
const SEL   = 'rgba(20,85,30,0.5)';
const DOT   = 'rgba(20,85,30,0.4)';
const SQ    = 64;

// White: ♙♘♗♖♕♔  Black: ♟♞♝♜♛♚
const PIECES = [
  ['', '♙', '♘', '♗', '♖', '♕', '♔'], // White
  ['', '♟', '♞', '♝', '♜', '♛', '♚'], // Black
] as const;

export const sqFromPoint = (x: number, y: number, flipped: boolean): Square => {
  const col  = Math.max(0, Math.min(7, Math.floor(x / SQ)));
  const row  = Math.max(0, Math.min(7, Math.floor(y / SQ)));
  const file = flipped ? 7 - col : col;
  const rank = flipped ? row : 7 - row;
  return rank * 8 + file;
};

export const boardToSVG = (
  state: GameState,
  selected: Square | null,
  legalTargets: Square[],
  flipped: boolean,
): string => {
  const parts: string[] = [];
  const targets = new Set(legalTargets);

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const sq  = rank * 8 + file;
      const px  = flipped ? (7 - file) * SQ : file * SQ;
      const py  = flipped ? rank * SQ : (7 - rank) * SQ;
      const sqColor = (file + rank) % 2 !== 0 ? LIGHT : DARK;

      parts.push(`<rect x="${px}" y="${py}" width="${SQ}" height="${SQ}" fill="${sqColor}"/>`);

      if (sq === selected) {
        parts.push(`<rect x="${px}" y="${py}" width="${SQ}" height="${SQ}" fill="${SEL}"/>`);
      }

      const p = state.board[sq]!;
      if (!isEmpty(p)) {
        const ch = PIECES[pieceColor(p)]![pieceType(p)] ?? '';
        parts.push(
          `<text x="${px + SQ / 2}" y="${py + SQ * 0.73}" ` +
          `text-anchor="middle" font-size="${SQ * 0.75}" font-family="serif">${ch}</text>`,
        );
      }

      if (targets.has(sq)) {
        if (!isEmpty(p)) {
          parts.push(
            `<circle cx="${px + SQ / 2}" cy="${py + SQ / 2}" ` +
            `r="${SQ * 0.44}" stroke="${DOT}" stroke-width="6" fill="none"/>`,
          );
        } else {
          parts.push(
            `<circle cx="${px + SQ / 2}" cy="${py + SQ / 2}" r="${SQ * 0.19}" fill="${DOT}"/>`,
          );
        }
      }
    }
  }
  return parts.join('');
};

export const renderBoard = (
  svg: SVGSVGElement,
  state: GameState,
  selected: Square | null,
  legalTargets: Square[],
  flipped: boolean,
): void => {
  svg.replaceChildren();
  svg.insertAdjacentHTML('beforeend', boardToSVG(state, selected, legalTargets, flipped));
};
