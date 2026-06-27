import { createInterface } from 'node:readline/promises';
import {
  Game, Color, status, bestMove, toFEN, isInCheck, sanToMove, moveToSan,
} from '../core/index.ts';
import { renderBoard } from './render.ts';
import { parseMove } from './input.ts';
import { hostGame, joinGame, parseAddress } from './network.ts';
import type { NetworkPeer } from './network.ts';

const DEPTH = 4;

const STATUS_MSG: Record<string, string> = {
  'checkmate':       'Checkmate!',
  'stalemate':       'Stalemate — draw.',
  'draw-50':         'Draw by 50-move rule.',
  'draw-repetition': 'Draw by threefold repetition.',
  'draw-material':   'Draw by insufficient material.',
};

const clearScreen = (): void => { process.stdout.write('\x1b[2J\x1b[H'); };

const playGame = async (
  rl: ReturnType<typeof createInterface>,
  aiColor: number | null,  // null = pass-and-play; Color.White or Color.Black
): Promise<void> => {
  const g = Game.newGame();

  while (true) {
    clearScreen();
    console.log(renderBoard(g.state()));

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

const playNetwork = async (
  rl: ReturnType<typeof createInterface>,
  myColor: Color,
  peer: NetworkPeer,
): Promise<void> => {
  const g = Game.newGame();
  let disconnected = false;

  // Queue of received SANs, plus a resolver waiting for the next one.
  const queue: string[] = [];
  let pendingResolve: ((san: string | null) => void) | null = null;

  peer.onMove((san) => {
    if (pendingResolve) {
      const cb = pendingResolve; pendingResolve = null; cb(san);
    } else {
      queue.push(san);
    }
  });

  peer.onClose(() => {
    disconnected = true;
    if (pendingResolve) {
      const cb = pendingResolve; pendingResolve = null; cb(null);
    }
  });

  // Awaits the next SAN from the peer. Returns null on disconnect.
  const recvMove = (): Promise<string | null> =>
    new Promise((resolve) => {
      if (disconnected) { resolve(null); return; }
      const queued = queue.shift();
      if (queued !== undefined) { resolve(queued); return; }
      pendingResolve = resolve;
    });

  while (true) {
    clearScreen();
    console.log(renderBoard(g.state()));

    const st = status(g);
    if (st !== 'ongoing') {
      console.log(STATUS_MSG[st] ?? 'Game over.');
      peer.close();
      await rl.question('Press Enter to return to menu...');
      break;
    }

    const turn = g.state().turn;
    const turnLabel = turn === Color.White ? 'White' : 'Black';

    if (turn !== myColor) {
      process.stdout.write('Waiting for opponent...');
      const san = await recvMove();
      if (san === null) {
        clearScreen();
        console.log(renderBoard(g.state()));
        console.log('Opponent disconnected.');
        await rl.question('Press Enter to return to menu...');
        break;
      }
      try {
        g.applyMove(sanToMove(g, san));
      } catch {
        clearScreen();
        console.log(renderBoard(g.state()));
        console.log('Received invalid move — desync detected.');
        peer.close();
        await rl.question('Press Enter to return to menu...');
        break;
      }
    } else {
      const checkTag = isInCheck(g.state()) ? ' [CHECK]' : '';
      const raw = await rl.question(`${turnLabel}${checkTag}> `);
      const cmd = raw.trim().toLowerCase();

      if (cmd === 'quit' || cmd === 'q') {
        peer.close();
        console.log('Goodbye!');
        process.exit(0);
      }
      if (cmd === 'fen') { console.log(toFEN(g.state())); continue; }
      if (cmd === 'undo') { console.log('Undo is not available in network games.'); continue; }
      if (cmd === 'new') { peer.close(); break; }

      try {
        const move = parseMove(g, raw);
        const san  = moveToSan(g, move); // capture SAN before applyMove
        g.applyMove(move);
        peer.send(san);
      } catch (e) {
        console.log((e as Error).message);
      }
    }
  }
};

const main = async (): Promise<void> => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.on('close', () => process.exit(0));

  while (true) {
    clearScreen();
    console.log('Chess\n');
    console.log('1. Pass-and-play');
    console.log('2. Vs AI (you play White)');
    console.log('3. Vs AI (you play Black)');
    console.log('4. Host network game  (you play White)');
    console.log('5. Join network game  (you play Black)');
    const choice = (await rl.question('\nChoose mode (1-5): ')).trim();

    if (choice === '1') {
      await playGame(rl, null);
    } else if (choice === '2') {
      await playGame(rl, Color.Black);
    } else if (choice === '3') {
      await playGame(rl, Color.White);
    } else if (choice === '4') {
      clearScreen();
      console.log('Hosting network game...\n');
      try {
        const peer = await hostGame((addr) => {
          console.log(`Share this address with your opponent:\n  ${addr}\n`);
          console.log('Waiting for opponent to connect...');
        });
        console.log('\nOpponent connected! Starting game...\n');
        await playNetwork(rl, Color.White, peer);
      } catch (err) {
        console.log(`Failed to start server: ${String(err)}`);
        await rl.question('Press Enter to continue...');
      }
      continue;
    } else if (choice === '5') {
      clearScreen();
      const raw = (await rl.question('Enter opponent\'s address (ip:port): ')).trim();
      const parsed = parseAddress(raw);
      if (!parsed) {
        console.log('Invalid address — use format: 192.168.x.x:PORT');
        await rl.question('Press Enter to continue...');
        continue;
      }
      try {
        const peer = await joinGame(parsed.host, parsed.port);
        console.log('\nConnected! Starting game...\n');
        await playNetwork(rl, Color.Black, peer);
      } catch (err) {
        console.log(`Failed to connect: ${String(err)}`);
        await rl.question('Press Enter to continue...');
      }
      continue;
    } else {
      console.log('Enter 1-5.');
      continue;
    }

    console.log('\n--- Press Enter to return to menu ---');
    await rl.question('');
  }
};

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
