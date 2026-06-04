/**
 * UGX integer helpers — all monetary amounts are stored as whole shillings (integers).
 * IEEE-754 floats can represent integers exactly up to 2^53 so standard number
 * arithmetic is safe provided every value entering the DB is rounded.
 */

/** Round to nearest whole shilling — use before any DB write. */
export function ugx(amount: number): number {
  return Math.round(amount);
}

/** Parse an incoming value to a whole-shilling integer, defaulting to 0. */
export function parseUGX(value: unknown): number {
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(n) ? ugx(n) : 0;
}
