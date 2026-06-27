# CLI Network Multiplayer Design

## Goal

Add browser-to-CLI local network chess via TCP. Two players on the same LAN each run the CLI; one hosts, one joins. No new runtime dependencies.

## Architecture

**New file: `src/cli/network.ts`**
Owns the TCP socket using Node's built-in `net` module. Exports two functions and a shared type:

```ts
export type NetworkPeer = {
  send:   (san: string) => void;
  onMove: (cb: (san: string) => void) => void;
  close:  () => void;
};

export const hostGame: (port?: number) => Promise<{ address: string; peer: NetworkPeer }>;
export const joinGame: (host: string, port: number) => Promise<NetworkPeer>;
```

`hostGame` resolves once the opponent connects. `joinGame` resolves once the connection is established. Both return a `NetworkPeer` that the game loop uses symmetrically.

**Modified file: `src/cli/main.ts`**
Adds menu options 4 (Host) and 5 (Join) to the existing menu. Calls `hostGame` / `joinGame`, then runs a dedicated `playNetwork` game loop.

## Wire Protocol

Newline-terminated SAN strings over raw TCP. Each move is a UTF-8 line, e.g. `e4\n`, `Nf3\n`, `O-O-O\n`. No framing, no JSON. The existing `sanToMove` parser handles decoding on the receiving end.

## Connection Flow

**Host (White):**
1. Selects option 4
2. `hostGame()` binds a TCP server on a random available port, resolves local IP via `os.networkInterfaces()` (non-loopback IPv4)
3. Prints `Listening on 192.168.x.x:PORT — share with opponent`
4. Waits; resolves when opponent connects
5. Game starts immediately — host plays White

**Joiner (Black):**
1. Selects option 5
2. Prompted for `ip:port`
3. `joinGame()` opens TCP connection
4. Game starts immediately — joiner plays Black

## Game Loop (`playNetwork`)

- On your turn: prompt for move → validate + apply locally → send SAN → redraw
- On opponent's turn: await next line from socket → `sanToMove` → apply → redraw
- Undo: disabled; prints "Undo is not available in network games."
- Disconnect mid-game: prints "Opponent disconnected." → returns to menu

## Error Handling

- `joinGame` connection refused: prints error, returns to menu (no crash)
- Invalid SAN received: prints desync warning, closes connection, returns to menu
- Port already in use: tries next port (up to 10 attempts), or falls back to user-visible error

## Constraints

- Zero new runtime dependencies — only `node:net` and `node:os` (Node built-ins)
- Host is always White; joiner is always Black
- No undo in network mode
- Local network only (no STUN/NAT traversal — that's what WebRTC is for)
