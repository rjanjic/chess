import { createServer, createConnection } from 'node:net';
import type { AddressInfo } from 'node:net';
import { networkInterfaces } from 'node:os';

export type NetworkPeer = {
  send:    (san: string) => void;
  onMove:  (cb: (san: string) => void) => void;
  onClose: (cb: () => void) => void;
  close:   () => void;
};

// Returns the first non-loopback IPv4 address, or '127.0.0.1' as fallback.
export const localIP = (): string => {
  for (const ifaces of Object.values(networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
};

// Parses "host:port" using the last colon as separator.
// Returns null if the port is missing, non-integer, or out of range 1-65535.
export const parseAddress = (input: string): { host: string; port: number } | null => {
  const idx = input.lastIndexOf(':');
  if (idx <= 0) return null;
  const host = input.slice(0, idx);
  const port = Number(input.slice(idx + 1));
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return { host, port };
};

// Shared socket → NetworkPeer wiring. Handles line-buffering for incoming SAN strings.
const wirePeer = (
  writeLine: (data: string) => void,
  destroy:   () => void,
): {
  peer:        NetworkPeer;
  handleData:  (chunk: string) => void;
  handleClose: () => void;
} => {
  let moveCallback:  ((san: string) => void) | null = null;
  let closeCallback: (() => void) | null = null;
  let destroyed = false;
  let buf = '';

  const handleData = (chunk: string): void => {
    buf += chunk;
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      const san = line.trim();
      if (san) moveCallback?.(san);
    }
  };

  const handleClose = (): void => { closeCallback?.(); };

  const peer: NetworkPeer = {
    send:    (san) => { if (!destroyed) writeLine(san + '\n'); },
    onMove:  (cb)  => { moveCallback = cb; },
    onClose: (cb)  => { closeCallback = cb; },
    close:   ()    => { destroyed = true; destroy(); },
  };

  return { peer, handleData, handleClose };
};

// Starts a TCP server. Calls onAddress immediately after binding so the caller
// can display the address while waiting. Resolves with a NetworkPeer once the
// first opponent connects (subsequent connections are rejected).
export const hostGame = (
  onAddress: (address: string) => void,
  port = 0,
): Promise<NetworkPeer> =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.on('error', reject);
    server.listen(port, '0.0.0.0', () => {
      const boundPort = (server.address() as AddressInfo).port;
      onAddress(`${localIP()}:${boundPort}`);

      server.once('connection', (socket) => {
        server.close();
        socket.setEncoding('utf8');
        const { peer, handleData, handleClose } = wirePeer(
          (data) => { socket.write(data); },
          () => { socket.destroy(); },
        );
        socket.on('data', handleData);
        socket.on('close', handleClose);
        socket.on('error', () => { /* swallow post-connect errors */ });
        resolve(peer);
      });
    });
  });

// Connects to a host. Resolves with a NetworkPeer once the TCP handshake completes.
export const joinGame = (host: string, port: number): Promise<NetworkPeer> =>
  new Promise((resolve, reject) => {
    const socket = createConnection({ host, port });
    socket.setEncoding('utf8');
    const { peer, handleData, handleClose } = wirePeer(
      (data) => { socket.write(data); },
      () => { socket.destroy(); },
    );
    socket.once('connect', () => {
      socket.on('data', handleData);
      socket.on('close', handleClose);
      socket.on('error', () => { /* swallow post-connect errors */ });
      resolve(peer);
    });
    socket.on('error', reject);
  });
