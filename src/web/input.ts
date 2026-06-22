import { sqFromPoint } from './render.ts';
import type { Square } from '../core/index.ts';

export const setupInput = (
  svg: SVGSVGElement,
  getFlipped: () => boolean,
  onSquareClick: (sq: Square) => void,
): (() => void) => {
  const handleClick = (e: MouseEvent): void => {
    const rect = svg.getBoundingClientRect();
    const sq = sqFromPoint(e.clientX - rect.left, e.clientY - rect.top, getFlipped());
    onSquareClick(sq);
  };
  svg.addEventListener('click', handleClick);
  return () => svg.removeEventListener('click', handleClick);
};
