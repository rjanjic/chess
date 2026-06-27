import type { GameState } from '../core/index.ts';
import { pieceType, pieceColor, isEmpty, Color } from '../core/index.ts';

// Indexed by PieceType value: 0=None, 1=Pawn, 2=Knight, 3=Bishop, 4=Rook, 5=Queen, 6=King
const PIECES = [
  ['', '♙', '♘', '♗', '♖', '♕', '♔'], // White (Color.White = 0)
  ['', '♟', '♞', '♝', '♜', '♛', '♚'], // Black (Color.Black = 1)
] as const;

const TOP   = '  ┌───┬───┬───┬───┬───┬───┬───┬───┐';
const SEP   = '  ├───┼───┼───┼───┼───┼───┼───┼───┤';
const BOT   = '  └───┴───┴───┴───┴───┴───┴───┴───┘';
const FILES = '    a   b   c   d   e   f   g   h';

export const renderBoard = (state: GameState): string => {
  const lines: string[] = [TOP];
  for (let rank = 7; rank >= 0; rank--) {
    let row = `${rank + 1} │`;
    for (let file = 0; file < 8; file++) {
      const p = state.board[rank * 8 + file]!;
      let ch: string;
      if (isEmpty(p)) {
        ch = (file + rank) % 2 === 0 ? '·' : ' ';
      } else {
        ch = PIECES[pieceColor(p)]![pieceType(p)] ?? '?';
      }
      row += ` ${ch} │`;
    }
    row += ` ${rank + 1}`;
    lines.push(row);
    if (rank > 0) lines.push(SEP);
  }
  lines.push(BOT);
  lines.push(FILES);
  return lines.join('\n');
};
