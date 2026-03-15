import { TooManyRequestsError } from "./errors";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 60,
};

const AUTH_CONFIG: RateLimitConfig = {
  windowMs: 900_000, // 15 min
  maxRequests: 10,
};

export function getRateLimitConfig(path: string): RateLimitConfig {
  if (path.includes("/auth/login") || path.includes("/auth/register")) {
    return AUTH_CONFIG;
  }
  return DEFAULT_CONFIG;
}

export function checkRateLimit(key: string, config: RateLimitConfig): void {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return;
  }

  entry.count++;
  if (entry.count > config.maxRequests) {
    throw new TooManyRequestsError(
      `Rate limit exceeded. Try again in ${Math.ceil((entry.resetAt - now) / 1000)}s`
    );
  }
}
