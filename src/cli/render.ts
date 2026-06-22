import type { GameState } from '../core/index.ts';
import { pieceType, pieceColor, isEmpty, Color } from '../core/index.ts';

// Indexed by PieceType value: 0=None, 1=Pawn, 2=Knight, 3=Bishop, 4=Rook, 5=Queen, 6=King
const PIECE_CHAR = ['.', 'P', 'N', 'B', 'R', 'Q', 'K'];

export const renderBoard = (state: GameState): string => {
  const lines: string[] = ['  a b c d e f g h'];
  for (let rank = 7; rank >= 0; rank--) {
    let row = `${rank + 1} `;
    for (let file = 0; file < 8; file++) {
      const p = state.board[rank * 8 + file]!;
      if (isEmpty(p)) {
        row += '. ';
      } else {
        const ch = PIECE_CHAR[pieceType(p)] ?? '.';
        row += (pieceColor(p) === Color.White ? ch : ch.toLowerCase()) + ' ';
      }
    }
    row += `${rank + 1}`;
    lines.push(row);
  }
  lines.push('  a b c d e f g h');
  return lines.join('\n');
};
