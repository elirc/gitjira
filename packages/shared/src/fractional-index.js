// LEARN: ordering is deceptively hard. Three ways to store "position":
//   1. integer 1,2,3… — moving a card between 1 and 2 renumbers everything
//      after it. O(n) writes per move.
//   2. gapped integers 100,200,300 — better, until the gap runs out.
//   3. FRACTIONAL keys — a string that always has room for another key
//      between any two. A move writes exactly ONE row, forever.
// We use (3). A key is a string of base-62 "digits" interpreted as the
// fraction 0.d1d2d3…, compared lexicographically. keyBetween(a, b) returns a
// key strictly between a and b. This is a small LexoRank; the production
// version adds bucket rebalancing we don't need at our scale.

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE = DIGITS.length; // 62
const MID = DIGITS[Math.floor(BASE / 2)];

const val = (c) => DIGITS.indexOf(c);

// Public API: a, b are existing keys or null (open ends). Returns a NEW key k
// with a < k < b under string comparison. Throws if a >= b.
export function keyBetween(a, b) {
  if (a !== null && b !== null && a >= b) {
    throw new Error(`keyBetween requires a < b, got "${a}" >= "${b}"`);
  }
  if (a === null && b === null) return MID;
  return midpoint(a ?? '', b);
}

// LEARN: the recursion is the whole trick. `a` is a lower-bound fraction
// (default 0), `b` is an upper bound or null (= 1, the top).
//   - share a common prefix? emit it and recurse on the rest.
//   - digits differ by more than 1? average them — room for a digit between.
//   - digits adjacent? take a's digit and recurse DEEPER with the upper bound
//     now OPEN (null): having chosen a digit below b's, everything after is
//     automatically < b, so we only need to stay > a.
function midpoint(a, b) {
  if (b !== null) {
    // Emit shared prefix, then solve the smaller problem.
    let i = 0;
    while (i < b.length && (i >= a.length || a[i] === b[i])) {
      if (i >= a.length) {
        // a ran out inside the shared prefix; treat missing as 0.
        if (val(b[i]) > 0) break;
      } else if (a[i] !== b[i]) {
        break;
      }
      i++;
    }
    if (i > 0) {
      return b.slice(0, i) + midpoint(a.slice(i), b.slice(i));
    }
  }

  const digitA = a.length > 0 ? val(a[0]) : 0;
  const digitB = b !== null && b.length > 0 ? val(b[0]) : BASE;

  if (digitB - digitA > 1) {
    // Room for a digit strictly between.
    return DIGITS[Math.floor((digitA + digitB) / 2)];
  }

  // Adjacent (or a-empty vs b-empty handled above): keep a's digit, recurse
  // with an OPEN top — everything below b's next digit stays < b.
  return DIGITS[digitA] + midpoint(a.slice(1), null);
}
