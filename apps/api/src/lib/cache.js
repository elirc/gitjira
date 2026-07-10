// LEARN (sprint 12): a READ-THROUGH cache. The caller asks the cache for a key;
// on a miss the cache calls the loader, stores the result with a TTL, and
// returns it. Callers never see the DB directly for cached reads — one code
// path, cache or no cache.
//
// The store is pluggable: Redis in production (shared across API instances),
// an in-memory Map in dev/test (no Redis dependency to run the suite). The
// interesting logic — read-through, single-flight, invalidation — lives ABOVE
// the store and is identical either way, which is why the invalidation test can
// run against the memory store and still prove the real behavior.

import { Redis } from 'ioredis';

const DISABLED = process.env.CACHE_DISABLED === '1';
const useRedis = !DISABLED && process.env.CACHE_BACKEND !== 'memory' && !!process.env.REDIS_HOST;

let redis = null;
function client() {
  if (!useRedis) return null;
  redis ??= new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  });
  return redis;
}

// In-memory fallback store (dev/test): key -> { value, expiresAt }.
const mem = new Map();

async function storeGet(key) {
  const r = client();
  if (r) {
    const raw = await r.get(key);
    return raw ? JSON.parse(raw) : undefined;
  }
  const hit = mem.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt < Date.now()) {
    mem.delete(key);
    return undefined;
  }
  return hit.value;
}

async function storeSet(key, value, ttlSeconds) {
  const r = client();
  if (r) {
    await r.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    return;
  }
  mem.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

async function storeDel(key) {
  const r = client();
  if (r) {
    await r.del(key);
    return;
  }
  mem.delete(key);
}

// LEARN: SINGLE-FLIGHT (cache-stampede protection). If 50 requests miss the same
// key at once — say a popular project's cache just expired — naively they'd all
// hit the DB simultaneously (a "stampede" that can knock the DB over exactly
// when it's busiest). We keep a map of in-flight loads keyed by cache key, so
// the first miss loads and the other 49 await the SAME promise. One DB hit, not
// fifty. NOTE: this is PER-PROCESS on purpose — across N API instances a cold
// key can still trigger up to N loads, and Redis absorbs the rest once the first
// instance writes. A cross-instance lock (redlock) is more machinery than a
// 60s-TTL member map deserves; per-process single-flight is the 99% win.
const inflight = new Map();

/**
 * Read-through with single-flight. Returns the cached value or loads, caches,
 * and returns it. `loader` must return a JSON-serializable value.
 */
export async function cached(key, ttlSeconds, loader) {
  if (DISABLED) return loader();

  const hit = await storeGet(key);
  if (hit !== undefined) return hit;

  if (inflight.has(key)) return inflight.get(key);

  const promise = (async () => {
    try {
      const value = await loader();
      await storeSet(key, value, ttlSeconds);
      return value;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, promise);
  return promise;
}

/** Drop a key. MUST be called on every mutation of the cached entity. */
export async function invalidate(key) {
  await storeDel(key);
}

// Test-only: reset the in-memory store between tests.
export function __clearMemoryCache() {
  mem.clear();
  inflight.clear();
}

// Cache-key builders — one place so a key format change can't drift.
export const cacheKeys = {
  projectMembers: (projectId) => `project:${projectId}:members`,
  projectColumns: (projectId) => `project:${projectId}:columns`,
};
