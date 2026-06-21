// Deterministic, seedable 64-bit PRNG (xorshift64*). Used only at module
// load to populate the Zobrist tables — never on the hot path.
const xorshift64 = (seed: bigint) => {
  let x = seed;
  const mask = (1n << 64n) - 1n;
  return (): bigint => {
    x ^= (x << 13n) & mask;
    x ^= (x >> 7n) & mask;
    x ^= (x << 17n) & mask;
    x &= mask;
    return (x * 0x2545F4914F6CDD1Dn) & mask;
  };
};

const rng = xorshift64(0x9E3779B97F4A7C15n);

// Indexed by Piece value (0..15). Slot 0 (EMPTY) is unused but allocated for
// uniform indexing.
const pieces: bigint[][] = Array.from({ length: 16 }, () =>
  Array.from({ length: 64 }, () => rng())
);

const side: bigint = rng();
// Indexed by 4-bit castling mask (0..15).
const castling: bigint[] = Array.from({ length: 16 }, () => rng());
// Indexed by file (0..7).
const epFile: bigint[] = Array.from({ length: 8 }, () => rng());

export const ZOBRIST = { pieces, side, castling, epFile } as const;
