import CryptoJS from "crypto-js";

export interface ProofOfWorkResult {
  hash: string;
  nonce: number;
}

export interface PowChallenge {
  challenge_id: string;
  challenge_data: string;
  difficulty: number;
  expires_at: string;
}

/**
 * Performs Proof of Work computation on the client side using backend challenge format
 * @param challenge_data - Base64 encoded random data from the server
 * @param difficulty - Number of leading zeros required in the hash
 * @returns Promise<ProofOfWorkResult> - The computed hash and nonce
 */
export async function performProofOfWork(
  challenge_data: string,
  difficulty: number,
): Promise<ProofOfWorkResult> {
  let nonce = 0;
  let hash = "";

  const start = Date.now();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Create hash from challenge_data + nonce (as per backend implementation)
    // Backend uses: hasher.update(challenge_data.as_bytes());
    //               hasher.update(nonce.to_le_bytes());

    // Convert nonce to little-endian bytes
    const nonceBytes = new Uint8Array(8);
    const view = new DataView(nonceBytes.buffer);
    view.setBigUint64(0, BigInt(nonce), true); // true = little-endian

    // Create WordArray from challenge_data
    const challengeWordArray = CryptoJS.enc.Utf8.parse(challenge_data);

    // Create WordArray from nonce bytes
    const nonceWordArray = CryptoJS.lib.WordArray.create(nonceBytes);

    // Combine them and hash
    const combined = challengeWordArray.concat(nonceWordArray);
    const finalHash = CryptoJS.SHA256(combined);
    hash = CryptoJS.enc.Base64.stringify(finalHash);

    // Check if hash meets the difficulty requirement
    if (meetsDifficulty(hash, difficulty)) {
      break;
    }

    nonce++;
  }

  return { hash, nonce };
}

/**
 * Check if hash meets difficulty requirement (number of leading zero BITS).
 * This matches the backend's meets_difficulty exactly: each all-zero byte
 * contributes 8, otherwise the byte's leading_zeros() count is added.
 * @param hash - Base64-encoded SHA-256 of (challenge_data ‖ nonce.to_le_bytes())
 * @param difficulty - number of leading zero bits required
 */
function meetsDifficulty(hash: string, difficulty: number): boolean {
  try {
    // Decode base64 hash to bytes
    const hashBytes = CryptoJS.enc.Base64.parse(hash);
    const hashArray = Array.from(
      hashBytes.words.flatMap((word) => [
        (word >>> 24) & 0xff,
        (word >>> 16) & 0xff,
        (word >>> 8) & 0xff,
        word & 0xff,
      ]),
    );

    let zeroBits = 0;

    for (const byte of hashArray) {
      if (byte === 0) {
        zeroBits += 8; // All bits zero
      } else {
        // Count leading zero bits of this byte (0x00..0x7F => >=1, 0x80.. => 0)
        let b = byte;
        let leading = 0;
        while ((b & 0x80) === 0 && leading < 8) {
          leading++;
          b <<= 1;
        }
        zeroBits += leading;
        break; // first non-zero byte ends the leading-zero run
      }
      if (zeroBits >= difficulty) {
        break;
      }
    }

    return zeroBits >= difficulty;
  } catch (error) {
    return false;
  }
}

/**
 * Validates a Proof of Work result locally (for debugging/testing)
 */
export function validateProofOfWork(
  challenge_data: string,
  nonce: number,
  hash: string,
  difficulty: number,
): boolean {
  // Convert nonce to little-endian bytes
  const nonceBytes = new Uint8Array(8);
  const view = new DataView(nonceBytes.buffer);
  view.setBigUint64(0, BigInt(nonce), true); // true = little-endian

  // Create WordArray from challenge_data
  const challengeWordArray = CryptoJS.enc.Utf8.parse(challenge_data);

  // Create WordArray from nonce bytes
  const nonceWordArray = CryptoJS.lib.WordArray.create(nonceBytes);

  // Combine them and hash
  const combined = challengeWordArray.concat(nonceWordArray);
  const computedHash = CryptoJS.enc.Base64.stringify(CryptoJS.SHA256(combined));

  return computedHash === hash && meetsDifficulty(computedHash, difficulty);
}
