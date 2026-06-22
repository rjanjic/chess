import { createInterface } from 'node:readline/promises';
import {
  Game, Color, status, bestMove, toFEN, isInCheck,
} from '../core/index.ts';
import { renderBoard } from './render.ts';
import { parseMove } from './input.ts';

const DEPTH = 4;

const STATUS_MSG: Record<string, string> = {
  'checkmate':       'Checkmate!',
  'stalemate':       'Stalemate — draw.',
  'draw-50':         'Draw by 50-move rule.',
  'draw-repetition': 'Draw by threefold repetition.',
  'draw-material':   'Draw by insufficient material.',
};

const playGame = async (
  rl: ReturnType<typeof createInterface>,
  aiColor: number | null,  // null = pass-and-play; Color.White or Color.Black
): Promise<void> => {
  const g = Game.newGame();

  while (true) {
    console.log('\n' + renderBoard(g.state()));

    const st = status(g);
    if (st !== 'ongoing') {
      console.log(STATUS_MSG[st] ?? 'Game over.');
      break;
    }

    const turn = g.state().turn;
    const turnLabel = turn === Color.White ? 'White' : 'Black';

    if (aiColor !== null && turn === aiColor) {
      process.stdout.write(`${turnLabel} (AI) is thinking...\r`);
      const m = bestMove(g, DEPTH);
      g.applyMove(m);
      process.stdout.write(' '.repeat(35) + '\r');
      continue;
    }

    const checkTag = isInCheck(g.state()) ? ' [CHECK]' : '';
    const raw = await rl.question(`${turnLabel}${checkTag}> `);
    const cmd = raw.trim().toLowerCase();

    if (cmd === 'quit' || cmd === 'q') {
      console.log('Goodbye!');
      process.exit(0);
    }
    if (cmd === 'fen') {
      console.log(toFEN(g.state()));
      continue;
    }
    if (cmd === 'undo') {
      if (g.moves.length === 0) {
        console.log('Nothing to undo.');
        continue;
      }
      g.undo();
      // In AI mode the last move before the human's turn was the AI's response —
      // undo it too so the human returns to their previous turn.
      if (aiColor !== null && g.moves.length > 0) g.undo();
      continue;
    }
    if (cmd === 'new') break;

    try {
      g.applyMove(parseMove(g, raw));
    } catch (e) {
      console.log((e as Error).message);
    }
  }
};

const main = async (): Promise<void> => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.on('close', () => process.exit(0));

  console.log('\nChess Engine v1\n');
  while (true) {
    console.log('1. Pass-and-play');
    console.log('2. Vs AI (you play White)');
    console.log('3. Vs AI (you play Black)');
    const choice = (await rl.question('\nChoose mode (1-3): ')).trim();

    if (choice === '1') {
      await playGame(rl, null);
    } else if (choice === '2') {
      await playGame(rl, Color.Black);   // AI plays Black
    } else if (choice === '3') {
      await playGame(rl, Color.White);   // AI plays White
    } else {
      console.log('Enter 1, 2, or 3.\n');
      continue;
    }
    console.log('\n--- Press Enter to return to menu ---');
  }
};

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
