import { PrismaClient } from '@prisma/client';

// LEARN: one PrismaClient for the whole process. Each client owns a
// connection pool; constructing one per request exhausts Postgres
// connections under load. Module scope in ESM = singleton for free.
const realClient = new PrismaClient();

// LEARN (sprint 11): `prisma` is a thin Proxy over "whichever client is active
// right now." This is dependency inversion, not a test hack — a swappable client
// is where a read-replica or a per-tenant client would one day plug in. Services
// do `import { prisma }` and never learn which client they're talking to.
// BREADCRUMB: today the ONLY caller that swaps it is the test setup — it installs
// a transaction-bound client so every query joins ONE transaction we then roll
// back, for instant isolation with no TRUNCATE (ADR 0022). Nothing in production
// calls __setActiveClient yet, so don't go hunting for a runtime swap that isn't
// there. ESM makes this cheap: the binding is stable, only the target moves.
let activeClient = realClient;

export const prisma = new Proxy(/** @type {PrismaClient} */ ({}), {
  get(_target, prop) {
    const value = /** @type {any} */ (activeClient)[prop];
    return typeof value === 'function' ? value.bind(activeClient) : value;
  },
});

// Test-only seam. Prefixed with __ so it's obviously not for app code.
export function __setActiveClient(client) {
  activeClient = client;
}
export function __resetActiveClient() {
  activeClient = realClient;
}
export const __realClient = realClient;
