import { describe, it, expect } from "vitest";
import {
  performProofOfWork,
  validateProofOfWork,
} from "./proofOfWork";

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
    const wrong = validateProofOfWork(
      otherChallenge,
      nonce,
      hash,
      difficulty,
    );
    // Validate against the wrong challenge must fail because the recomputed
    // hash for otherChallenge won't equal our hash.
    expect(wrong).toBe(false);
  });
});
