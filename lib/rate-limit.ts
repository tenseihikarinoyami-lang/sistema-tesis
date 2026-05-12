/**
 * Rate limiting for serverless environments.
 * Note: This uses in-memory storage which works per Lambda instance.
 * For distributed rate limiting across instances, use Redis/Upstash.
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Use global to persist across warm invocations in same instance
declare global {
  var __rateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const rateLimitStore = global.__rateLimitStore || (global.__rateLimitStore = new Map());

const WINDOW_MS = 60000;
const MAX_REQUESTS = 20;

export function checkRateLimit(clientId: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(clientId);

  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(clientId, { count: 1, resetTime: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetIn: WINDOW_MS };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetIn: entry.resetTime - now };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_REQUESTS - entry.count, resetIn: entry.resetTime - now };
}

export function getRateLimitHeaders(result: ReturnType<typeof checkRateLimit>): Record<string, string> {
  return {
    'X-RateLimit-Limit': MAX_REQUESTS.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': (Date.now() + result.resetIn).toString(),
    'X-RateLimit-Allowed': result.allowed ? 'true' : 'false',
  };
}