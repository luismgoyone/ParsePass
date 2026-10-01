import { ExtractionError } from "@/lib/extraction/types";
import type { RateLimitResult } from "@/lib/rate-limit";

/** 429 with Retry-After, worded for whichever allowance ran out. */
export function rateLimited(quota: RateLimitResult, what: string): Response {
  const retryAfter = Math.max(1, Math.ceil((quota.reset - Date.now()) / 1000));
  return Response.json(
    {
      error: `You've used today's ${quota.limit} free ${what}. Try again in ${formatWait(retryAfter)}.`,
    },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

/** Turn a thrown error into a JSON response without leaking details. */
export function errorResponse(error: unknown, route: string): Response {
  if (error instanceof ExtractionError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(`${route}: unexpected error`, error instanceof Error ? error.name : typeof error);
  return Response.json({ error: "Something went wrong. Try again." }, { status: 500 });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

function formatWait(seconds: number): string {
  const hours = Math.round(seconds / 3600);
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
