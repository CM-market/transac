import { describe, it, expect } from "vitest";
import CryptoJS from "crypto-js";
import { performProofOfWork, validateProofOfWork } from "./proofOfWork";

/**
 * Count the number of leading zero BITS of a base64-encoded hash.
 * This mirrors the backend's bit-level difficulty rule (each all-zero byte
 * contributes 8; otherwise the byte's leading_zeros() is added).
 */
function leadingZeroBits(hash: string): number {
  const bytes = CryptoJS.enc.Base64.parse(hash);
  const array = Array.from(
    bytes.words.flatMap((word) => [
      (word >>> 24) & 0xff,
      (word >>> 16) & 0xff,
      (word >>> 8) & 0xff,
      word & 0xff,
    ]),
  );

  let bits = 0;
  for (const byte of array) {
    if (byte === 0) {
      bits += 8;
      continue;
    }
    let b = byte;
    while ((b & 0x80) === 0 && bits < 256) {
      bits++;
      b <<= 1;
    }
    break;
  }
  return bits;
}

describe("performProofOfWork", () => {
  it("computes a solution whose hash meets the requested difficulty", async () => {
    const challengeData = "Q2hhbGxlbmdlRGF0YQ=="; // fixed challenge data
    const difficulty = 4;

    const result = await performProofOfWork(challengeData, difficulty);

    // A valid POW result yields a deterministic nonce + hash pair that
    // independently re-validates.
    expect(result.nonce).toBeGreaterThanOrEqual(0);
    expect(result.hash).toBeTruthy();
    expect(
      validateProofOfWork(challengeData, result.nonce, result.hash, difficulty),
    ).toBe(true);

    // Cross-stack guarantee: the hash the frontend produced must satisfy the
    // BACKEND's bit-level leading-zero rule (not the old nibble-level rule),
    // so the backend's verify_solution will accept it.
    expect(leadingZeroBits(result.hash)).toBeGreaterThanOrEqual(difficulty);
  });

  it("works with a low difficulty quickly and deterministically", async () => {
    const challengeData = "bG93LWRpZmZpY3VsdHk=";
    const difficulty = 1;

    const a = await performProofOfWork(challengeData, difficulty);
    const b = await performProofOfWork(challengeData, difficulty);

    // Deterministic for the same challenge: same nonce + hash.
    expect(a).toEqual(b);
  });
});

describe("bit-level difficulty rule (backend parity)", () => {
  // Fixed byte strings, base64-encoded, with a KNOWN leading-zero-bit count.
  // These pin the bit-level counting rule: an all-zero byte contributes 8,
  // otherwise the byte's leading_zeros() is added and the run stops at the
  // first non-zero byte (identical to backend src/crypto/pow.rs meets_difficulty).
  const vectors: Array<{ b64: string; expectedBits: number }> = [
    // 0x80 -> 0 leading zero bits
    { b64: "gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", expectedBits: 0 },
    // 0x40 -> 1 leading zero bit
    { b64: "QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", expectedBits: 1 },
    // 0x20 -> 2 leading zero bits
    { b64: "IAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", expectedBits: 2 },
    // 0x01 -> 7 leading zero bits (byte 0x01; next byte 0x00 keeps counting? no — 0x01 is the first non-zero byte, stops at 7)
    { b64: "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", expectedBits: 7 },
    // two all-zero bytes then 0x80: 8 + 8 + 0 = 16, then stops at 0x80
    { b64: "AACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", expectedBits: 16 },
    // one all-zero byte then 0x01: 8 + 7 = 15
    { b64: "AAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", expectedBits: 15 },
  ];

  it.each(vectors)(
    "decodes $b64 to $expectedBits leading zero bits",
    ({ b64, expectedBits }) => {
      expect(leadingZeroBits(b64)).toBe(expectedBits);
    },
  );

  it("produces and accepts a solution at higher bit-level difficulty via validateProofOfWork", async () => {
    // difficulty 12 requires 12 leading zero BITS (1.5 zero bytes).
    const challengeData = "Yml0LWxldmVsLWRpZmZpY3VsdHk=";
    const difficulty = 12;
    const { nonce, hash } = await performProofOfWork(challengeData, difficulty);

    expect(leadingZeroBits(hash)).toBeGreaterThanOrEqual(difficulty);
    expect(validateProofOfWork(challengeData, nonce, hash, difficulty)).toBe(
      true,
    );

    // Old nibble-level rule would interpret 12 bits as ~6 hex zeros and could
    // accept a weaker hash; assert the produced hash passes at the bit granularity
    // the backend uses.
    expect(leadingZeroBits(hash) >= difficulty).toBe(true);
  });
});

describe("validateProofOfWork", () => {
  it("accepts a correct solution for the challenge", async () => {
    const challengeData = "dmFsaWQtc29sdXRpb24=";
    const difficulty = 2;
    const { nonce, hash } = await performProofOfWork(challengeData, difficulty);

    expect(validateProofOfWork(challengeData, nonce, hash, difficulty)).toBe(
      true,
    );
  });

  it("rejects a solution with a wrong nonce (invalid certificate)", () => {
    const challengeData = "aW52YWxpZC1ub25jZQ==";
    const difficulty = 1;
    // A fresh hash for a nonce we have NOT actually solved is rejected.
    const result = validateProofOfWork(challengeData, 99999, "", difficulty);
    expect(result).toBe(false);
  });

  it("rejects a tampered hash that does not match the challenge", async () => {
    const challengeData = "dGFtcGVyZWQtaGFzaA==";
    const difficulty = 1;
    const { nonce, hash } = await performProofOfWork(challengeData, difficulty);

    // Same hash but for this challenge the nonce recomputes differently is
    // valid; instead verify a mismatch: use a hash for a different challenge.
    const otherChallenge = "b3RoZXItY2hhbGxlbmdl";
    const wrong = validateProofOfWork(otherChallenge, nonce, hash, difficulty);
    // Validate against the wrong challenge must fail because the recomputed
    // hash for otherChallenge won't equal our hash.
    expect(wrong).toBe(false);
  });
});
