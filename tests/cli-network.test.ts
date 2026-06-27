import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseAddress, localIP, hostGame, joinGame } from '../src/cli/network.ts';

describe('parseAddress', () => {
  it('parses a valid ip:port', () => {
    assert.deepStrictEqual(
      parseAddress('192.168.1.1:5000'),
      { host: '192.168.1.1', port: 5000 },
    );
  });

  it('parses localhost:port', () => {
    assert.deepStrictEqual(
      parseAddress('localhost:3000'),
      { host: 'localhost', port: 3000 },
    );
  });

  it('returns null for missing colon', () => {
    assert.strictEqual(parseAddress('192.168.1.1'), null);
  });

  it('returns null for port 0', () => {
    assert.strictEqual(parseAddress('host:0'), null);
  });

  it('returns null for port > 65535', () => {
    assert.strictEqual(parseAddress('host:65536'), null);
  });

  it('returns null for non-numeric port', () => {
    assert.strictEqual(parseAddress('host:abc'), null);
  });

  it('handles IPv6-style input with last colon as separator', () => {
    assert.deepStrictEqual(
      parseAddress('::1:9999'),
      { host: '::1', port: 9999 },
    );
  });
});

describe('localIP', () => {
  it('returns a non-empty string', () => {
    const ip = localIP();
    assert.ok(typeof ip === 'string' && ip.length > 0);
  });
});

describe('hostGame + joinGame integration', () => {
  it('connects host and joiner and round-trips SAN moves', async () => {
    const hostReceived: string[] = [];
    const joinReceived: string[] = [];

    let resolveAddr!: (addr: string) => void;
    const addrPromise = new Promise<string>(r => { resolveAddr = r; });

    const hostPeerPromise = hostGame(resolveAddr);
    const addr = await addrPromise;
    const parsed = parseAddress(addr)!;

    const [joinPeer, hostPeer] = await Promise.all([
      joinGame(parsed.host, parsed.port),
      hostPeerPromise,
    ]);

    hostPeer.onMove(san => hostReceived.push(san));
    joinPeer.onMove(san => joinReceived.push(san));

    hostPeer.send('e4');
    joinPeer.send('e5');

    await new Promise(r => setTimeout(r, 50));

    assert.deepStrictEqual(joinReceived, ['e4'], 'joiner receives host move');
    assert.deepStrictEqual(hostReceived, ['e5'], 'host receives joiner move');

    hostPeer.close();
    joinPeer.close();
  });

  it('fires onClose on joiner when host closes connection', async () => {
    let resolveAddr!: (addr: string) => void;
    const addrPromise = new Promise<string>(r => { resolveAddr = r; });
    const hostPeerPromise = hostGame(resolveAddr);
    const addr = await addrPromise;
    const parsed = parseAddress(addr)!;

    const [joinPeer, hostPeer] = await Promise.all([
      joinGame(parsed.host, parsed.port),
      hostPeerPromise,
    ]);

    let closed = false;
    joinPeer.onClose(() => { closed = true; });

    hostPeer.close();
    await new Promise(r => setTimeout(r, 50));

    assert.ok(closed, 'onClose fires when remote peer closes');
    joinPeer.close();
  });
});
