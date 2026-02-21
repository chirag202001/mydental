/* ────────────────────────────────────────────────────────────────
   In-memory rate limiter — sliding window counter per key.
   Suitable for single-instance deployments. For multi-instance,
   swap with a Redis-based implementation.
   ──────────────────────────────────────────────────────────────── */

import { headers } from "next/headers";
import { logger } from "@/lib/logger";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given key.
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const entry = store.get(key);

  // No entry or window expired → fresh window
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return {
      success: true,
      remaining: options.maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  // Within window
  if (entry.count < options.maxRequests) {
    entry.count++;
    return {
      success: true,
      remaining: options.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  // Rate limited
  return {
    success: false,
    remaining: 0,
    resetAt: entry.resetAt,
  };
}

/**
 * Get the client's IP address from request headers.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

/* ────────────────────────────────────────────────────────────────
   Pre-configured rate limiters for common use cases
   ──────────────────────────────────────────────────────────────── */

/** Auth routes: 5 attempts per 60 seconds per IP */
const AUTH_RATE_LIMIT: RateLimitOptions = {
  maxRequests: 5,
  windowSeconds: 60,
};

/** General API: 30 requests per 60 seconds per IP */
const API_RATE_LIMIT: RateLimitOptions = {
  maxRequests: 30,
  windowSeconds: 60,
};

/**
 * Enforce rate limiting on auth-related server actions.
 * Returns an error string if rate limited, otherwise null.
 */
export async function rateLimitAuth(
  action: string
): Promise<string | null> {
  const ip = await getClientIp();
  const key = `auth:${action}:${ip}`;
  const result = checkRateLimit(key, AUTH_RATE_LIMIT);

  if (!result.success) {
    const retryIn = Math.ceil((result.resetAt - Date.now()) / 1000);
    logger.warn("Rate limit exceeded", {
      action,
      ip,
      retryInSeconds: retryIn,
    });
    return `Too many attempts. Please try again in ${retryIn} seconds.`;
  }

  return null;
}

/**
 * Enforce rate limiting on general API calls.
 */
export async function rateLimitApi(
  action: string
): Promise<string | null> {
  const ip = await getClientIp();
  const key = `api:${action}:${ip}`;
  const result = checkRateLimit(key, API_RATE_LIMIT);

  if (!result.success) {
    const retryIn = Math.ceil((result.resetAt - Date.now()) / 1000);
    logger.warn("API rate limit exceeded", {
      action,
      ip,
      retryInSeconds: retryIn,
    });
    return `Too many requests. Please try again in ${retryIn} seconds.`;
  }

  return null;
}
