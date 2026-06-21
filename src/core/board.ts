export type Square = number; // 0..63, a1=0, h8=63

export const FILE_A = 0;
export const FILE_H = 7;
export const RANK_1 = 0;
export const RANK_8 = 7;

export const square = (file: number, rank: number): Square => rank * 8 + file;
export const fileOf = (sq: Square): number => sq & 7;
export const rankOf = (sq: Square): number => (sq >> 3) & 7;

export const onBoard = (file: number, rank: number): boolean =>
  file >= 0 && file < 8 && rank >= 0 && rank < 8;

export const squareName = (sq: Square): string =>
  'abcdefgh'[fileOf(sq)]! + String(rankOf(sq) + 1);

export const parseSquare = (s: string): Square => {
  if (s.length !== 2) throw new Error(`Invalid square: ${s}`);
  const file = s.charCodeAt(0) - 97; // 'a'
  const rank = s.charCodeAt(1) - 49; // '1'
  if (!onBoard(file, rank)) throw new Error(`Invalid square: ${s}`);
  return square(file, rank);
};
