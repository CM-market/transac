/**
 * Validate a phone number in Cameroon format.
 *
 * Rule (mirrors the backend validator in `src/db/profiles.rs`): after stripping
 * all non-digit characters, the remaining digit string must be exactly a `237`
 * country code followed by 9 digits (i.e. a 12-digit string starting with `237`).
 * Leading `+`, spaces and dashes are accepted and ignored.
 */
export function isValidCameroonPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("237");
}
