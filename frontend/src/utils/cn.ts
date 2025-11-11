/**
 * Simple utility function to merge CSS classes
 * Filters out falsy values and joins classes with spaces
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ');
}
