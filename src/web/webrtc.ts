// Wire protocol — JSON messages sent over the RTCDataChannel.
export type PeerMessage =
  | { type: 'move'; san: string; fenHash: string }
  | { type: 'resign' }
  | { type: 'draw-offer' }
  | { type: 'draw-accept' };

export type PeerCallbacks = {
  onOpen:    () => void;
  onClose:   () => void;
  onMessage: (msg: PeerMessage) => void;
};

export type PeerConnection = {
  send:  (msg: PeerMessage) => void;
  close: () => void;
};

// ── Pure codec helpers (testable without a browser) ──────────────────────────

// Encodes an SDP object as 'key=<base64-json>'.
export const encodeFragment = (key: string, data: object): string =>
  `${key}=${btoa(JSON.stringify(data))}`;

// Extracts and decodes the value for 'key' from a URL hash or fragment string.
// hash may start with '#' or not. Returns null if key is missing or base64 is invalid.
export const decodeFragment = (hash: string, key: string): RTCSessionDescriptionInit | null => {
  const raw  = hash.startsWith('#') ? hash.slice(1) : hash;
  const pair = raw.split('&').find(p => p.startsWith(`${key}=`));
  if (!pair) return null;
  const encoded = pair.slice(key.length + 1);
  try { return JSON.parse(atob(encoded)) as RTCSessionDescriptionInit; }
  catch { return null; }
};

// Returns the low 32 bits of a Zobrist hash as an 8-char lowercase hex string.
export const zobristHex = (z: bigint): string =>
  (z & 0xFFFF_FFFFn).toString(16).padStart(8, '0');

// ── Internal helpers ──────────────────────────────────────────────────────────

const ICE: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

// Waits for ICE gathering to finish, then returns the final local description.
const waitForICE = (pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> =>
  new Promise<RTCSessionDescriptionInit>((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve(pc.localDescription!);
      return;
    }
    const check = (): void => {
      if (pc.iceGatheringState !== 'complete') return;
      pc.removeEventListener('icegatheringstatechange', check);
      resolve(pc.localDescription!);
    };
    pc.addEventListener('icegatheringstatechange', check);
  });

const wireChannel = (channel: RTCDataChannel, cb: PeerCallbacks): PeerConnection => {
  channel.onopen    = (): void => cb.onOpen();
  channel.onclose   = (): void => cb.onClose();
  channel.onmessage = (e: MessageEvent<string>): void => {
    try { cb.onMessage(JSON.parse(e.data) as PeerMessage); }
    catch { /* drop malformed messages */ }
  };
  return {
    send:  (msg) => channel.send(JSON.stringify(msg)),
    close: ()    => channel.close(),
  };
};

// ── Public connection API ─────────────────────────────────────────────────────

export type HostResult = {
  offerUrl: string;
  connect:  (answerInput: string) => Promise<void>;
  peer:     PeerConnection;
};

export const host = async (pageOrigin: string, cb: PeerCallbacks): Promise<HostResult> => {
  const pc      = new RTCPeerConnection(ICE);
  const channel = pc.createDataChannel('chess');
  const peer    = wireChannel(channel, cb);

  await pc.setLocalDescription(await pc.createOffer());
  const sdp      = await waitForICE(pc);
  const offerUrl = `${pageOrigin}/#${encodeFragment('offer', sdp)}`;

  const connect = async (answerInput: string): Promise<void> => {
    const idx    = answerInput.indexOf('#');
    const hash   = idx >= 0 ? answerInput.slice(idx) : `#${answerInput}`;
    const answer = decodeFragment(hash, 'answer');
    if (!answer) throw new Error('Invalid reply link — could not decode SDP answer');
    await pc.setRemoteDescription(answer);
  };

  return { offerUrl, connect, peer };
};

export type JoinResult = {
  answerUrl: string;
  peer:      PeerConnection;
};

export const join = async (offerInput: string, pageOrigin: string, cb: PeerCallbacks): Promise<JoinResult> => {
  const idx   = offerInput.indexOf('#');
  const hash  = idx >= 0 ? offerInput.slice(idx) : `#${offerInput}`;
  const offer = decodeFragment(hash, 'offer');
  if (!offer) throw new Error('Invalid invite link — could not decode SDP offer');

  const pc = new RTCPeerConnection(ICE);
  let channel: RTCDataChannel | null = null;

  pc.ondatachannel = (e: RTCDataChannelEvent): void => {
    channel = e.channel;
    channel.onopen    = (): void => cb.onOpen();
    channel.onclose   = (): void => cb.onClose();
    channel.onmessage = (ev: MessageEvent<string>): void => {
      try { cb.onMessage(JSON.parse(ev.data) as PeerMessage); }
      catch { /* drop malformed messages */ }
    };
  };

  await pc.setRemoteDescription(offer);
  await pc.setLocalDescription(await pc.createAnswer());
  const sdp       = await waitForICE(pc);
  const answerUrl = `${pageOrigin}/#${encodeFragment('answer', sdp)}`;

  const peer: PeerConnection = {
    send:  (msg) => { if (channel) channel.send(JSON.stringify(msg)); },
    close: ()    => { if (channel) channel.close(); },
  };

  return { answerUrl, peer };
};
