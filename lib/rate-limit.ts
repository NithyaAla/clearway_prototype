// Best-effort rate limit so a public demo link can't be used to run up your API bill.
// It's in-memory, so each server instance counts separately. Your Console spend limit
// is the real safety net.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_PER_10_MIN ?? 40);
const hits = new Map<string, number[]>();

export function rateLimited(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_REQUESTS;
}
