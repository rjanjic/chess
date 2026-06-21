export const PieceType = {
  None: 0,
  Pawn: 1,
  Knight: 2,
  Bishop: 3,
  Rook: 4,
  Queen: 5,
  King: 6,
} as const;
export type PieceType = typeof PieceType[keyof typeof PieceType];

export const Color = {
  White: 0,
  Black: 1,
} as const;
export type Color = typeof Color[keyof typeof Color];

export type Piece = number;

export const EMPTY: Piece = 0;

export const piece = (type: PieceType, color: Color): Piece =>
  (type & 0b111) | ((color & 1) << 3);

export const pieceType = (p: Piece): PieceType => (p & 0b111) as PieceType;
export const pieceColor = (p: Piece): Color => ((p >> 3) & 1) as Color;
export const isEmpty = (p: Piece): boolean => p === 0;
export const opposite = (c: Color): Color => (c ^ 1) as Color;
