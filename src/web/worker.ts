/// <reference lib="webworker" />
import { Game, fromFEN, bestMove, moveToSan } from '../core/index.ts';

type WorkerIn  = { fen: string; depth: number };
type WorkerOut = { san: string } | { error: string };

self.onmessage = (e: MessageEvent<WorkerIn>): void => {
  try {
    const state = fromFEN(e.data.fen);
    const game = Game.fromState(state);
    const move = bestMove(game, e.data.depth);
    const san  = moveToSan(game, move);
    self.postMessage({ san } satisfies WorkerOut);
  } catch (err) {
    self.postMessage({ error: String(err) } satisfies WorkerOut);
  }
};
