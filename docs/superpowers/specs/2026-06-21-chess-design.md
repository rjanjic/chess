# Chess Game — Design Spec

**Date:** 2026-06-21
**Status:** Approved, ready for implementation planning

## Goal

A fully-playable chess game in TypeScript with **zero runtime or build dependencies** beyond `tsc` itself. Supports single-player (vs AI) and multiplayer (local pass-and-play, plus browser-to-browser online via WebRTC). Implements full FIDE rules including PGN/FEN import/export.

## Non-Goals

- Frameworks (React, Vue, etc.) — vanilla DOM only.
- Bundlers (Vite, Webpack, esbuild) — `tsc` only, ES modules served as-is.
- npm dependencies of any kind. Node and browser built-ins only.
- A hosted matchmaking server. Online multiplayer uses URL-fragment signaling, no backend.
- Engine strength beyond ~1200–1500 ELO. Stronger play is out of scope for v1.

## Architecture

Three layers. The core knows nothing about UIs or networks. Both UIs consume it through a `Game` class. This keeps the engine testable in pure Node and lets the browser run the AI in a Web Worker.

```
src/
  core/                  # pure TS, no DOM, no Node APIs — runs anywhere
    board.ts             # 8x8 array representation, square indexing
    pieces.ts            # Piece, Color enums + helpers
    moves.ts             # move generation incl. castling, en passant, promotion
    game.ts              # Game class: state, history, apply/undo
    rules.ts             # check, checkmate, stalemate, draws (3-fold, 50-move, insufficient)
    notation.ts          # FEN + PGN parse/serialize, SAN
    ai.ts                # negamax + alpha-beta, depth ~4, material + PST eval
  cli/                   # Node.js terminal UI (built-ins only: readline, process)
    main.ts              # entry, mode select
    render.ts            # ASCII board
    input.ts             # move parser (algebraic + coords)
  web/                   # browser UI (vanilla DOM/SVG, no framework)
    index.html
    styles.css
    main.ts              # entry, mode select
    render.ts            # SVG board + DOM status
    input.ts             # click + drag-drop
    webrtc.ts            # peer setup + URL-fragment signaling
    worker.ts            # AI runs here so the UI stays responsive
tests/                   # node --test (built-in runner)
  core.test.ts
  perft.test.ts          # standard move-gen correctness check
  notation.test.ts
  ai.test.ts
scripts/
  serve.mjs              # ~30-line static server for the web build
docs/superpowers/specs/  # this document
```

**Modes per platform:**

| Mode               | CLI | Web |
|--------------------|-----|-----|
| Pass-and-play      | ✔   | ✔   |
| Vs AI              | ✔   | ✔   |
| Online (WebRTC)    | —   | ✔   |

## Core Data Model

**Board:** `Uint8Array` of length 64, indexed `rank*8 + file` (a1=0, h8=63). Each byte is a packed `Piece`: 3 bits type (pawn/knight/bishop/rook/queen/king), 1 bit color. `0` means empty. Compact and cache-friendly for AI search.

**Game state** (immutable per move, history kept as a stack):

```ts
type GameState = {
  board: Uint8Array;          // 64 squares
  turn: 'w' | 'b';
  castling: number;           // 4-bit mask: WK, WQ, BK, BQ
  enPassant: number | null;   // target square index, or null
  halfmoveClock: number;      // for 50-move rule
  fullmoveNumber: number;
  zobrist: bigint;            // position hash for repetition detection
};

type Move = {
  from: number;
  to: number;
  promotion?: 'q' | 'r' | 'b' | 'n';
  flags: number;              // bit flags: capture, castle, en-passant, double-push
};
```

`Game` holds `states: GameState[]` and `moves: Move[]`. `applyMove(m)` pushes a new state; `undo()` pops. Threefold repetition counts duplicates of `zobrist` across the history.

**Public API:**

```ts
game.legalMoves(): Move[]
game.applyMove(m: Move): void
game.undo(): void
game.status(): 'ongoing' | 'checkmate' | 'stalemate' | 'draw-50' | 'draw-repetition' | 'draw-material'
game.toFEN(): string
game.toPGN(): string
Game.fromFEN(s: string): Game
Game.fromPGN(s: string): Game
```

## AI

`core/ai.ts` — pure function `bestMove(game: Game, depth: number): Move`. No I/O, no module state.

- **Search:** negamax with alpha-beta pruning, fixed depth 4 (configurable).
- **Evaluation:** material (P=100, N=320, B=330, R=500, Q=900) + piece-square tables (standard textbook values, mirrored for black) + small mobility bonus (legal-move count / 10).
- **Move ordering:** captures first via MVV-LVA (most valuable victim, least valuable attacker), then quiet moves. Cuts the search tree significantly.

**Execution:**
- CLI: synchronous call from the input loop. Terminal blocking is acceptable.
- Web: runs in `web/worker.ts` (built-in Web Worker, zero deps). UI thread posts current FEN; worker replies with the chosen move in SAN. UI stays responsive during search.

## Networking (Browser-to-Browser, WebRTC)

`web/webrtc.ts`. No signaling server — connection info travels via URL fragments that players share through any out-of-band channel.

**Connection flow:**

1. Host clicks "Host game" → browser creates `RTCPeerConnection` with a single `RTCDataChannel`, generates SDP offer, waits for ICE gathering to complete, base64-encodes the offer, produces `https://.../#offer=<base64>`.
2. Host sends URL to opponent (Slack, SMS, etc.).
3. Opponent opens URL → page detects `#offer=` in `location.hash`, generates SDP answer, base64-encodes, produces return URL `https://.../#answer=<base64>`.
4. Opponent sends return URL back to host. Host pastes into a text field → connection establishes over the data channel.

**Wire protocol** (JSON over the data channel):

| Message                                              | Direction | Meaning                                                |
|------------------------------------------------------|-----------|--------------------------------------------------------|
| `{type:'move', san:'Nf3', fenHash:'<8 hex>'}`       | either    | Move played + Zobrist hash of resulting position       |
| `{type:'resign'}`                                    | either    | Sender resigns                                         |
| `{type:'draw-offer'}`                                | either    | Offer a draw                                           |
| `{type:'draw-accept'}`                               | either    | Accept the offer (closes the game as a draw)           |

**Validation:** receiver parses SAN, applies to local game, compares Zobrist hash. Mismatch ⇒ desync ⇒ abort with a banner and the current FEN in `localStorage` for manual recovery.

**Color assignment:** host = white by default; `?color=b` query param flips it.

**Disconnect:** `RTCDataChannel.onclose` → "Opponent disconnected" banner + copy-FEN button.

## Build & Run

- `tsconfig.json`: `strict: true`, `target: ES2022`, `module: ES2022`, `moduleResolution: bundler`, `outDir: dist/`.
- `package.json` declares `"type": "module"` and an empty `"dependencies"`. **TypeScript is the one allowed `devDependency`** — it is a compiler, not shipped code, and "zero deps" in this project means zero *runtime* deps. No other dev tools (no linter, no test runner package, no bundler, no `ts-node`).
- Scripts:
  - `build`: `tsc`. Emits `dist/core/`, `dist/cli/`, `dist/web/`.
  - `serve:web`: `node scripts/serve.mjs`. ~30-line static server using built-in `http` + `fs`. Required because ES modules can't load from `file://`.
- CLI: `node dist/cli/main.js`.
- Web: `http://localhost:8080` after `serve:web`.
- `dist/` is gitignored.

## Testing

`node --test` (built-in test runner, Node 22+). TypeScript runs natively via `--experimental-strip-types`. No `ts-node`, no Jest, no Vitest.

- `core.test.ts` — piece movement, check detection, castling rules and obstructions, en passant trigger and expiry, promotion to each piece, all draw conditions.
- `notation.test.ts` — FEN round-trips for ~20 known positions; PGN of a famous game (e.g. Kasparov–Topalov 1999) parses and replays to the expected final FEN.
- `perft.test.ts` — [perft](https://www.chessprogramming.org/Perft) at depth 3 from the starting position (expected: 8,902 nodes) and depth 4 from the "Kiwipete" position (expected: 4,085,603). The standard correctness gauntlet for move generators. Slow tests gated behind `--test-name-pattern=slow` so the default run stays under a second.
- `ai.test.ts` — sanity checks: mate-in-1 returns the mating move; never returns an illegal move; evaluation is symmetric (swap colors → opposite sign).

Run: `node --test --experimental-strip-types tests/**/*.test.ts`.

## Error Handling

- `core/` throws `IllegalMoveError`, `FenParseError`, `PgnParseError` with structured detail (offset, expected vs actual). Never silently corrects bad input.
- CLI catches at the input loop, prints the message, re-prompts.
- Web catches at the input handler boundary, shows a toast, leaves the board state unchanged.
- WebRTC connection failure or move desync: return to mode-select with a banner. Current game state preserved as FEN in `localStorage` for manual recovery.

## Out of Scope (deferred)

- Opening books, endgame tablebases.
- Time controls / clocks.
- Spectator mode, multi-game lobbies.
- Mobile-specific UI (drag handling tuned for desktop first).
- Engine strength tuning beyond depth-4 alpha-beta.
