import { Color, PieceType, EMPTY, piece, pieceColor, pieceType } from './pieces.ts';
import type { Square } from './board.ts';
import { square, parseSquare, squareName } from './board.ts';
import { CASTLE_WK, CASTLE_WQ, CASTLE_BK, CASTLE_BQ, computeZobrist } from './game.ts';
import type { GameState } from './game.ts';

export const STARTING_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export class FenParseError extends Error {
  constructor(message: string) { super(`FEN parse: ${message}`); }
}

const PIECE_LETTER: Record<number, string> = (() => {
  const m: Record<number, string> = {};
  const map: [PieceType, string][] = [
    [PieceType.Pawn, 'p'], [PieceType.Knight, 'n'], [PieceType.Bishop, 'b'],
    [PieceType.Rook, 'r'], [PieceType.Queen, 'q'], [PieceType.King, 'k'],
  ];
  for (const [t, ch] of map) {
    m[piece(t, Color.White)] = ch.toUpperCase();
    m[piece(t, Color.Black)] = ch;
  }
  return m;
})();

const LETTER_PIECE: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  for (const [p, ch] of Object.entries(PIECE_LETTER)) m[ch] = Number(p);
  return m;
})();

export const toFEN = (s: GameState): string => {
  // Board (ranks 8..1, each row left-to-right).
  const rows: string[] = [];
  for (let r = 7; r >= 0; r--) {
    let row = '', empties = 0;
    for (let f = 0; f < 8; f++) {
      const p = s.board[square(f, r)]!;
      if (p === EMPTY) { empties += 1; continue; }
      if (empties > 0) { row += String(empties); empties = 0; }
      row += PIECE_LETTER[p]!;
    }
    if (empties > 0) row += String(empties);
    rows.push(row);
  }
  const placement = rows.join('/');
  const turn = s.turn === Color.White ? 'w' : 'b';
  let castling = '';
  if (s.castling & CASTLE_WK) castling += 'K';
  if (s.castling & CASTLE_WQ) castling += 'Q';
  if (s.castling & CASTLE_BK) castling += 'k';
  if (s.castling & CASTLE_BQ) castling += 'q';
  if (castling === '') castling = '-';
  const ep = s.enPassant === null ? '-' : squareName(s.enPassant);
  return `${placement} ${turn} ${castling} ${ep} ${s.halfmoveClock} ${s.fullmoveNumber}`;
};

export const fromFEN = (fen: string): GameState => {
  const parts = fen.trim().split(/\s+/);
  if (parts.length !== 6) throw new FenParseError(`expected 6 fields, got ${parts.length}`);
  const [placement, turnStr, castlingStr, epStr, halfStr, fullStr] = parts as
    [string, string, string, string, string, string];

  const board = new Uint8Array(64);
  const rows = placement.split('/');
  if (rows.length !== 8) throw new FenParseError(`expected 8 ranks, got ${rows.length}`);
  for (let r = 0; r < 8; r++) {
    const row = rows[7 - r]!;
    let f = 0;
    for (const ch of row) {
      if (ch >= '1' && ch <= '8') {
        f += Number(ch);
      } else if (LETTER_PIECE[ch] !== undefined) {
        if (f >= 8) throw new FenParseError(`rank overflow at ${row}`);
        board[square(f, r)] = LETTER_PIECE[ch]!;
        f += 1;
      } else {
        throw new FenParseError(`unknown piece character '${ch}'`);
      }
    }
    if (f !== 8) throw new FenParseError(`rank '${row}' has width ${f}, expected 8`);
  }

  const turn = turnStr === 'w' ? Color.White : turnStr === 'b' ? Color.Black
    : (() => { throw new FenParseError(`turn must be w or b, got ${turnStr}`); })();

  let castling = 0;
  if (castlingStr !== '-') {
    for (const ch of castlingStr) {
      switch (ch) {
        case 'K': castling |= CASTLE_WK; break;
        case 'Q': castling |= CASTLE_WQ; break;
        case 'k': castling |= CASTLE_BK; break;
        case 'q': castling |= CASTLE_BQ; break;
        default: throw new FenParseError(`unknown castling character '${ch}'`);
      }
    }
  }

  let enPassant: Square | null = null;
  if (epStr !== '-') {
    try { enPassant = parseSquare(epStr); }
    catch { throw new FenParseError(`invalid en passant square '${epStr}'`); }
  }

  const halfmoveClock = Number(halfStr);
  const fullmoveNumber = Number(fullStr);
  if (!Number.isInteger(halfmoveClock) || halfmoveClock < 0)
    throw new FenParseError('Invalid halfmove clock: ' + parts[4]);
  if (!Number.isInteger(fullmoveNumber) || fullmoveNumber < 1)
    throw new FenParseError('Invalid fullmove number: ' + parts[5]);

  if (enPassant !== null) {
    const epRank = Math.floor(enPassant / 8);
    const expectedEpRank = turn === Color.White ? 5 : 2;
    if (epRank !== expectedEpRank)
      throw new FenParseError('Invalid en-passant square rank');
  }

  const partial = { board, turn, castling, enPassant, halfmoveClock, fullmoveNumber };
  return { ...partial, zobrist: computeZobrist(partial) };
};
