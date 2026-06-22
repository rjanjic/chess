import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encodeFragment, decodeFragment, zobristHex } from '../src/web/webrtc.ts';

describe('encodeFragment / decodeFragment', () => {
  it('round-trips an SDP-like object through a hash string', () => {
    const sdp = { type: 'offer', sdp: 'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\n' };
    const fragment = encodeFragment('offer', sdp);
    const decoded  = decodeFragment(`#${fragment}`, 'offer');
    assert.deepStrictEqual(decoded, sdp);
  });

  it('returns null when the key is absent', () => {
    const fragment = encodeFragment('offer', { type: 'offer', sdp: '' });
    assert.strictEqual(decodeFragment(`#${fragment}`, 'answer'), null);
  });

  it('returns null for malformed base64', () => {
    assert.strictEqual(decodeFragment('#offer=!!!not-valid!!!', 'offer'), null);
  });

  it('handles input that starts without a leading #', () => {
    const sdp = { type: 'answer', sdp: 'v=0\r\n' };
    const fragment = encodeFragment('answer', sdp);
    const decoded  = decodeFragment(fragment, 'answer');
    assert.deepStrictEqual(decoded, sdp);
  });
});

describe('zobristHex', () => {
  it('returns exactly 8 lowercase hex chars', () => {
    const hex = zobristHex(0xDEADBEEFCAFEBABEn);
    assert.match(hex, /^[0-9a-f]{8}$/);
    assert.strictEqual(hex, 'cafebabe');
  });

  it('pads short values to 8 chars', () => {
    assert.strictEqual(zobristHex(0n),   '00000000');
    assert.strictEqual(zobristHex(1n),   '00000001');
    assert.strictEqual(zobristHex(255n), '000000ff');
  });
});
