/**
 * Per-user rate limiting using Deno KV.
 *
 * Uses a fixed-window counter keyed by [scope, userId, windowStart].
 * Falls back silently (allows the request) if Deno KV is unavailable,
 * so a KV outage never blocks legitimate users.
 */

interface RateLimitOptions {
  /** Identifier for the limit group, e.g. 'payment', 'loan_apply' */
  scope: string;
  userId: string;
  /** Maximum requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSecs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // unix seconds
}

export async function checkRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  try {
    const kv = await Deno.openKv();
    const windowStart = Math.floor(Date.now() / 1000 / opts.windowSecs) * opts.windowSecs;
    const resetAt = windowStart + opts.windowSecs;
    const key = ['rl', opts.scope, opts.userId, windowStart];

    const entry = await kv.get<number>(key);
    const count = (entry.value ?? 0) + 1;

    if (count > opts.limit) {
      return { allowed: false, remaining: 0, resetAt };
    }

    await kv.set(key, count, { expireIn: opts.windowSecs * 1000 });
    return { allowed: true, remaining: opts.limit - count, resetAt };
  } catch {
    // KV unavailable — fail open so infrastructure issues don't block users
    return { allowed: true, remaining: -1, resetAt: 0 };
  }
}

/** Convenience: return a 429 Response with Retry-After header. */
export function rateLimitedResponse(resetAt: number): Response {
  const retryAfter = Math.max(1, resetAt - Math.floor(Date.now() / 1000));
  return Response.json(
    { error: 'Too many requests. Please wait before trying again.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}
