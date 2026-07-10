// @ts-check
import { __realClient, __setActiveClient, __resetActiveClient } from '../src/lib/prisma.js';

// LEARN (sprint 11): transaction-rollback isolation. Each test runs inside ONE
// database transaction that we never commit — at the end we roll it back, so
// the next test sees a pristine world. Same isolation as TRUNCATE-between-tests,
// a fraction of the cost: nothing ever hits disk to be cleaned up.
//
// THE GOTCHA the plan warned about: the code under test opens its OWN
// transactions (`prisma.$transaction(...)` in the services). Postgres/Prisma
// don't allow a real nested transaction on an interactive tx client. So we hand
// the code a WRAPPED tx whose `$transaction` is FLATTENED — an inner
// `$transaction(fn)` just runs `fn` against the same outer tx. The service's
// "all-or-nothing" still holds *within our test tx*, and our rollback undoes
// everything at the end. (Trade-off: a test can no longer observe a service's
// transaction rolling back independently — those belong in the truncate-based
// concurrency suite. ADR 0022.)

const ROLLBACK = Symbol('rollback-after-test');

/** Wrap an interactive tx so nested $transaction calls flatten onto it. */
function flattenTx(tx) {
  return new Proxy(tx, {
    get(target, prop) {
      if (prop === '$transaction') {
        return (/** @type {any} */ arg) => {
          // Interactive form: run the callback against the SAME tx.
          if (typeof arg === 'function') return arg(target);
          // Batch (array) form: the promises are already bound to this tx via
          // the proxy; await them in order (concurrent queries on one tx race).
          if (Array.isArray(arg)) {
            return (async () => {
              const results = [];
              for (const p of arg) results.push(await p);
              return results;
            })();
          }
          throw new Error('test tx proxy: unsupported $transaction argument');
        };
      }
      const value = target[prop];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

let releaseGate; // resolving this lets the held-open tx proceed to roll back
let txSettled; // resolves once the rollback has completed

/**
 * Begin a rolled-back transaction and route `prisma` through it. Call in
 * beforeEach; pair with `endRollbackTx` in afterEach.
 */
export async function beginRollbackTx() {
  await new Promise((ready, fail) => {
    const gate = new Promise((res) => {
      releaseGate = res;
    });
    txSettled = __realClient
      .$transaction(
        async (tx) => {
          __setActiveClient(flattenTx(tx));
          ready(undefined); // tx is open and installed; let the test run
          await gate; // hold the tx open for the duration of the test
          throw ROLLBACK; // throwing makes Prisma roll the tx back
        },
        // Generous timeout: some tests do real bcrypt (~250ms) plus several
        // queries; the default 5s can trip under CI/Docker load.
        { timeout: 30_000, maxWait: 10_000 }
      )
      .catch((err) => {
        if (err !== ROLLBACK) fail(err);
      });
  });
}

/** Roll the transaction back and restore the real client. Call in afterEach. */
export async function endRollbackTx() {
  releaseGate();
  await txSettled;
  __resetActiveClient();
}
