import { Game, MoveFlag } from './game.ts';
import type { Move } from './game.ts';
import { legalMoves } from './moves.ts';
import { isInCheck } from './attacks.ts';
import { PieceType, pieceType } from './pieces.ts';
import { fileOf, rankOf, squareName, parseSquare } from './board.ts';

const TYPE_LETTER: string[] = [];
TYPE_LETTER[PieceType.None] = '';
TYPE_LETTER[PieceType.Pawn] = '';
TYPE_LETTER[PieceType.Knight] = 'N';
TYPE_LETTER[PieceType.Bishop] = 'B';
TYPE_LETTER[PieceType.Rook] = 'R';
TYPE_LETTER[PieceType.Queen] = 'Q';
TYPE_LETTER[PieceType.King] = 'K';

const LETTER_TYPE: Record<string, PieceType> = {
  N: PieceType.Knight, B: PieceType.Bishop, R: PieceType.Rook,
  Q: PieceType.Queen,  K: PieceType.King,
};

const isCheckmateAfter = (g: Game, m: Move): { check: boolean; mate: boolean } => {
  g.applyMove(m);
  const check = isInCheck(g.state());
  const mate = check && legalMoves(g.state()).length === 0;
  g.undo();
  return { check, mate };
};

export const moveToSan = (g: Game, m: Move): string => {
  const s = g.state();
  const moving = s.board[m.from]!;
  const type = pieceType(moving);

  // Castling.
  if ((m.flags & MoveFlag.Castle) !== 0) {
    const base = fileOf(m.to) === 6 ? 'O-O' : 'O-O-O';
    const { check, mate } = isCheckmateAfter(g, m);
    return base + (mate ? '#' : check ? '+' : '');
  }

  const isCapture = (m.flags & MoveFlag.Capture) !== 0;

  let san = '';

  if (type === PieceType.Pawn) {
    if (isCapture) san += 'abcdefgh'[fileOf(m.from)]! + 'x';
    san += squareName(m.to);
    if ((m.flags & MoveFlag.Promotion) !== 0) san += '=' + TYPE_LETTER[m.promotion!];
  } else {
    san += TYPE_LETTER[type];
    // Disambiguation: any other legal move of the same piece type that lands on the same square.
    const ambiguous = legalMoves(s).filter(
      (x) => x.from !== m.from && x.to === m.to
        && pieceType(s.board[x.from]!) === type,
    );
    if (ambiguous.length > 0) {
      const sameFile = ambiguous.some((x) => fileOf(x.from) === fileOf(m.from));
      const sameRank = ambiguous.some((x) => rankOf(x.from) === rankOf(m.from));
      if (!sameFile) san += 'abcdefgh'[fileOf(m.from)]!;
      else if (!sameRank) san += String(rankOf(m.from) + 1);
      else san += squareName(m.from);
    }
    if (isCapture) san += 'x';
    san += squareName(m.to);
  }

  const { check, mate } = isCheckmateAfter(g, m);
  if (mate) san += '#'; else if (check) san += '+';
  return san;
};

const stripCheck = (san: string): string => san.replace(/[+#]$/, '');

export const sanToMove = (g: Game, sanIn: string): Move => {
  const s = g.state();
  const candidates = legalMoves(s);
  const san = stripCheck(sanIn);

  // Castling shortcuts.
  if (san === 'O-O' || san === '0-0') {
    const m = candidates.find((c) => (c.flags & MoveFlag.Castle) !== 0 && fileOf(c.to) === 6);
    if (!m) throw new Error(`Illegal SAN: ${sanIn}`);
    return m;
  }
  if (san === 'O-O-O' || san === '0-0-0') {
    const m = candidates.find((c) => (c.flags & MoveFlag.Castle) !== 0 && fileOf(c.to) === 2);
    if (!m) throw new Error(`Illegal SAN: ${sanIn}`);
    return m;
  }

  // Promotion suffix: =Q, =R, =B, =N (optional '=').
  let body = san;
  let promotion: PieceType | undefined;
  const promoMatch = body.match(/=?([QRBN])$/);
  if (promoMatch) {
    promotion = LETTER_TYPE[promoMatch[1]!];
    body = body.slice(0, body.length - promoMatch[0].length);
  }

  // Piece letter (optional; pawns omitted).
  let pieceType_: PieceType = PieceType.Pawn;
  if (body.length > 0 && body[0]! >= 'A' && body[0]! <= 'Z') {
    const t = LETTER_TYPE[body[0]!];
    if (t === undefined) throw new Error(`Illegal SAN: ${sanIn}`);
    pieceType_ = t;
    body = body.slice(1);
  }

  // Capture indicator 'x'.
  const isCapture = body.includes('x');
  body = body.replace('x', '');

  // Destination square = last 2 chars.
  if (body.length < 2) throw new Error(`Illegal SAN: ${sanIn}`);
  const to = parseSquare(body.slice(-2));
  body = body.slice(0, -2);

  // Remaining body is disambiguation: 0, 1 (file or rank), or 2 (full square).
  let fromFile: number | null = null;
  let fromRank: number | null = null;
  for (const ch of body) {
    if (ch >= 'a' && ch <= 'h') fromFile = ch.charCodeAt(0) - 97;
    else if (ch >= '1' && ch <= '8') fromRank = ch.charCodeAt(0) - 49;
    else throw new Error(`Illegal SAN: ${sanIn}`);
  }

  const matches = candidates.filter((c) => {
    const p = s.board[c.from]!;
    if (pieceType(p) !== pieceType_) return false;
    if (c.to !== to) return false;
    if (promotion !== undefined && c.promotion !== promotion) return false;
    if (promotion === undefined && (c.flags & MoveFlag.Promotion) !== 0) return false;
    if (fromFile !== null && fileOf(c.from) !== fromFile) return false;
    if (fromRank !== null && rankOf(c.from) !== fromRank) return false;
    // For pawn captures the 'x' is required by convention; we don't enforce it as
    // a filter to keep parsing forgiving.
    void isCapture;
    return true;
  });

  if (matches.length === 0) throw new Error(`Illegal SAN: ${sanIn}`);
  if (matches.length > 1) throw new Error(`Ambiguous SAN: ${sanIn}`);
  return matches[0]!;
};
