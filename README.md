# Chess

Zero-dependency TypeScript chess engine with CLI and browser UIs, including browser-to-browser online multiplayer via WebRTC.

## Requirements

- Node ≥ 22.6 (native `.ts` execution via `--experimental-strip-types`)

## Build

```
npm install      # installs TypeScript (the only devDependency)
npm run build    # compiles core + CLI + web UI + web worker → dist/
```

## Test

```
npm test
```

## Run

**CLI** (play in the terminal):

```
npm run build
npm run cli
```

**Web UI** (play in the browser):

```
npm run build
npm run serve:web
```

Then open `http://localhost:8080`.

## Online multiplayer (browser)

The web UI supports browser-to-browser play with no server — SDP is exchanged via URL fragments you share out-of-band (Slack, SMS, email, etc.).

1. One player selects **Host Online Game** in the mode dropdown. A link is generated — copy and share it.
2. The other player opens the link. Their browser auto-detects the invite and generates a reply link — copy and share it back.
3. The host pastes the reply link and clicks **Connect**. The game starts once the WebRTC connection opens.

Alternatively, the joiner can select **Join Online Game** and paste the host's link manually.

## Local network multiplayer (CLI)

Two players on the same LAN can play via TCP — no server, no accounts, no internet.

**Host (plays White):**

```
npm run cli
# Choose option 4 — Host network game
# Share the displayed address (e.g. 192.168.1.5:54321) with your opponent
```

**Join (plays Black):**

```
npm run cli
# Choose option 5 — Join network game
# Enter the host's address when prompted
```

The game starts as soon as the joiner connects.
