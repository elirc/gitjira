import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { timeAgo } from '../src/lib/format.js';

// LEARN (sprint 11): CLOCK-DEPENDENCE, flake taxonomy item #2. timeAgo reads
// Date.now(). The naive test —
//     const fiveMinAgo = new Date(Date.now() - 5*60_000).toISOString();
//     expect(timeAgo(fiveMinAgo)).toBe('5 minutes ago');
// — passes ~always and fails rarely: if the process is preempted between the
// test's Date.now() and the code's Date.now() ACROSS a unit boundary (59.6s ->
// 60.1s), the rounding flips and you get "a minute ago" instead of the seconds
// branch, or "6 minutes ago". Re-running "fixes" it — which is exactly how a
// flake teaches a team to ignore red.
//
// The fix: FREEZE the clock. With a pinned system time, the test and the code
// read the same instant, so timeAgo becomes a pure function of its input and
// the assertion is exact and stable.

const NOW = new Date('2026-07-09T12:00:00.000Z');
const ago = (ms) => new Date(NOW.getTime() - ms).toISOString();

describe('timeAgo (deterministic via fake timers)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW); // both this test and Date.now() inside timeAgo agree
  });
  afterEach(() => {
    vi.useRealTimers(); // never leak a frozen clock to the next test
  });

  it('formats a few minutes ago', () => {
    expect(timeAgo(ago(5 * 60_000))).toBe('5 minutes ago');
  });

  it('formats a few hours ago', () => {
    expect(timeAgo(ago(2 * 3_600_000))).toBe('2 hours ago');
  });

  it('collapses exactly one day to "yesterday" (numeric:auto)', () => {
    expect(timeAgo(ago(24 * 3_600_000))).toBe('yesterday');
  });

  it('says "now" at zero elapsed', () => {
    expect(timeAgo(NOW.toISOString())).toBe('now');
  });
});
