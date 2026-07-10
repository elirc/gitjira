// LEARN (sprint 13): a SLIDING-WINDOW rate limiter. A fixed-window counter (reset
// every minute on the clock) has a burst bug: 5 requests at 11:00:59 and 5 more
// at 11:01:00 is 10 in one second but passes two windows. A sliding window keeps
// the actual timestamps and counts how many fall within the last `windowMs`, so
// the limit holds no matter where the clock boundary is.
//
// Store is in-memory here (one process). In production behind multiple instances
// you'd back this with Redis (INCR + PEXPIRE, or a sorted set) so the limit is
// global; the algorithm is identical. Disabled in tests by default so the suite
// (which logs in many times from one IP) isn't throttled — a dedicated test
// turns it on.

const buckets = new Map(); // key -> number[] (request timestamps, ms)

let enabled = process.env.RATE_LIMIT_DISABLED !== '1';

/**
 * @param {{ name: string, windowMs: number, max: number, keyFn: (req: any) => string }} opts
 */
export function rateLimit({ name, windowMs, max, keyFn }) {
  return (req, res, next) => {
    if (!enabled) return next();
    const key = `${name}:${keyFn(req)}`;
    const now = Date.now();
    const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

    if (recent.length >= max) {
      const retryMs = windowMs - (now - recent[0]);
      res.setHeader('Retry-After', String(Math.ceil(retryMs / 1000)));
      return res
        .status(429)
        .json({ error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down' } });
    }

    recent.push(now);
    buckets.set(key, recent);
    next();
  };
}

// LEARN (sprint 13): keying is the whole game. Key too broad (IP only) and a
// corporate NAT — a whole office behind one IP — gets locked out by one user's
// typos, while an attacker rotating IPs isn't slowed on a TARGETED account. Key
// too narrow and you miss distributed attacks. Login needs BOTH: IP (stop a
// scanner) AND account (stop credential-stuffing a specific user from anywhere).
export const keyByIp = (req) => req.ip ?? 'unknown';
export const keyByIpAndAccount = (req) =>
  `${req.ip ?? 'unknown'}|${(req.body?.email ?? 'noacct').toLowerCase()}`;

// Test hooks.
export const __setRateLimitEnabled = (v) => {
  enabled = v;
};
export const __clearRateLimits = () => buckets.clear();
