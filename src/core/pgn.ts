import { Game } from './game.ts';
import { moveToSan, sanToMove } from './san.ts';
import { status } from './rules.ts';
import { Color } from './pieces.ts';

const RESULT_TOKENS = new Set(['1-0', '0-1', '1/2-1/2', '*']);

const resultFor = (g: Game): string => {
  const s = status(g);
  if (s === 'checkmate') {
    // The side to move has no moves; the *other* side delivered mate.
    return g.state().turn === Color.White ? '0-1' : '1-0';
  }
  if (s === 'stalemate' || s === 'draw-50' || s === 'draw-repetition' || s === 'draw-material') {
    return '1/2-1/2';
  }
  return '*';
};

export const toPGN = (g: Game): string => {
  // We rebuild SAN as we walk the moves, because moveToSan depends on the
  // position the move was made from.
  const replay = Game.fromState(g.states[0]!);
  const tokens: string[] = [];
  for (let i = 0; i < g.moves.length; i++) {
    if (i % 2 === 0) tokens.push(`${(i >> 1) + 1}.`);
    const san = moveToSan(replay, g.moves[i]!);
    tokens.push(san);
    replay.applyMove(g.moves[i]!);
  }
  tokens.push(resultFor(g));
  return tokens.join(' ');
};

const stripCommentsAndHeaders = (pgn: string): string => {
  // Remove header lines [ ... ]
  let s = pgn.replace(/\[[^\]]*\]/g, ' ');
  // Remove curly-brace comments
  s = s.replace(/\{[^}]*\}/g, ' ');
  // Strip nested variations iteratively until none remain.
  let prev = '';
  while (prev !== s) {
    prev = s;
    s = s.replace(/\([^()]*\)/g, ' ');
  }
  return s;
};

export const fromPGN = (pgn: string): Game => {
  const cleaned = stripCommentsAndHeaders(pgn);
  // Tokenize: strip move numbers (1., 1...) and whitespace.
  const tokens = cleaned
    .split(/\s+/)
    .map((t) => t.replace(/^\d+\.+/, ''))
    .filter((t) => t.length > 0);

  const game = Game.newGame();
  for (const tok of tokens) {
    if (RESULT_TOKENS.has(tok)) break;
    if (!/^[a-zA-Z]/.test(tok)) continue;  // skip NAGs, numbers, annotations
    game.applyMove(sanToMove(game, tok));
  }
  return game;
};
