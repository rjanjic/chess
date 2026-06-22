import { Game, PieceType, legalMoves, sanToMove, parseSquare } from '../core/index.ts';
import type { Move } from '../core/index.ts';

// Maps lowercase promotion letter to PieceType value.
const PROMO_CHAR: Partial<Record<string, PieceType>> = {
  q: PieceType.Queen, r: PieceType.Rook, b: PieceType.Bishop, n: PieceType.Knight,
};

const parseCoord = (g: Game, text: string): Move | null => {
  const m = text.match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/i);
  if (!m) return null;
  const from = parseSquare(m[1]!);
  const to = parseSquare(m[2]!);
  const promoCh = m[3]?.toLowerCase();
  const promoType = promoCh !== undefined ? PROMO_CHAR[promoCh] : undefined;
  return legalMoves(g.state()).find(
    (mv) => mv.from === from && mv.to === to && mv.promotion === promoType,
  ) ?? null;
};

export const parseMove = (g: Game, text: string): Move => {
  const trimmed = text.trim();
  try {
    return sanToMove(g, trimmed);
  } catch {
    // fall through to coordinate notation
  }
  const coord = parseCoord(g, trimmed);
  if (coord !== null) return coord;
  throw new Error(
    `Unrecognized move: "${trimmed}". Use SAN (e4, Nf3, O-O) or coordinates (e2e4).`,
  );
};
