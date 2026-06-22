export { Game, MoveFlag, CASTLE_WK, CASTLE_WQ, CASTLE_BK, CASTLE_BQ } from './game.ts';
export type { Move, GameState } from './game.ts';

export { Color, PieceType, EMPTY, piece, pieceColor, pieceType, opposite } from './pieces.ts';
export type { Piece } from './pieces.ts';

export {
  square, fileOf, rankOf, onBoard, squareName, parseSquare,
  FILE_A, FILE_H, RANK_1, RANK_8,
} from './board.ts';
export type { Square } from './board.ts';

export { pseudoLegalMoves, legalMoves } from './moves.ts';
export { isSquareAttacked, isInCheck } from './attacks.ts';
export { status } from './rules.ts';
export type { GameStatus } from './rules.ts';

export { toFEN, fromFEN, STARTING_FEN, FenParseError } from './fen.ts';
export { moveToSan, sanToMove } from './san.ts';
export { toPGN, fromPGN } from './pgn.ts';
export { evaluate } from './ai-eval.ts';
export { bestMove } from './ai.ts';
