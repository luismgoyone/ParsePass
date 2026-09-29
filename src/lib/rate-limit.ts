import "server-only";

import { createHash } from "node:crypto";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { optionalEnv } from "@/lib/env";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Unix ms when the window resets. */
  reset: number;
}

let limiter: Ratelimit | null | undefined;
let warned = false;

/** Upstash Redis limiter, or null when not configured (local dev, tests, previews without it). */
function getLimiter(): Ratelimit | null {
  if (limiter !== undefined) return limiter;
  // The Vercel Marketplace integration sets KV_REST_API_*; a direct Upstash database sets UPSTASH_*.
  const url = optionalEnv("UPSTASH_REDIS_REST_URL") ?? optionalEnv("KV_REST_API_URL");
  const token = optionalEnv("UPSTASH_REDIS_REST_TOKEN") ?? optionalEnv("KV_REST_API_TOKEN");
  if (!url || !token) {
    limiter = null;
    return null;
  }
  limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.fixedWindow(conversionsPerDay(), "1 d"),
    prefix: "parsepass:extract",
  });
  return limiter;
}

export function conversionsPerDay(): number {
  const n = Number(optionalEnv("RATE_LIMIT_PER_DAY") ?? 5);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

/** Hash the visitor's IP so Redis never holds a raw address. */
export function visitorKey(request: Request): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return createHash("sha256").update(`parsepass:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Count one Claude conversion against the visitor's daily allowance. Fails open: if Redis is
 * unreachable, the request goes through and the error is logged (without the key).
 */
export async function takeConversion(request: Request): Promise<RateLimitResult | null> {
  const rl = getLimiter();
  if (!rl) {
    if (!warned && process.env.VERCEL_ENV === "production") {
      console.warn("rate-limit: Upstash Redis isn't configured; /api/extract is not rate limited");
      warned = true;
    }
    return null;
  }
  try {
    const { success, limit, remaining, reset } = await rl.limit(visitorKey(request));
    return { allowed: success, limit, remaining, reset };
  } catch (error) {
    console.error(
      "rate-limit: Redis error, allowing request",
      error instanceof Error ? error.name : typeof error,
    );
    return null;
  }
}
