import { describe, it, expect } from 'vitest';
import {
  assertTransition,
  canTransition,
  SPRINT_STATE,
} from '../src/domain/sprint-state-machine.js';

// LEARN: THIS is the showcase for testing business logic without HTTP. No
// supertest, no database, no bcrypt — just the domain rules as pure functions.
// These tests run in milliseconds and cover every transition, legal and
// illegal. When your rules live in a state machine, this is how cheap testing
// them becomes.
describe('sprint state machine', () => {
  it('starts a PLANNED sprint that has issues', () => {
    expect(assertTransition('start', SPRINT_STATE.PLANNED, { issueCount: 3 })).toBe(
      SPRINT_STATE.ACTIVE
    );
  });

  it('refuses to start a sprint with no issues', () => {
    expect(() => assertTransition('start', SPRINT_STATE.PLANNED, { issueCount: 0 })).toThrow(
      /no issues/
    );
  });

  it('refuses to start a sprint that is already active', () => {
    expect(() => assertTransition('start', SPRINT_STATE.ACTIVE, { issueCount: 3 })).toThrow(
      /must be PLANNED/
    );
  });

  it('completes an ACTIVE sprint', () => {
    expect(assertTransition('complete', SPRINT_STATE.ACTIVE)).toBe(SPRINT_STATE.COMPLETED);
  });

  it('refuses to complete a PLANNED sprint', () => {
    expect(() => assertTransition('complete', SPRINT_STATE.PLANNED)).toThrow(/must be ACTIVE/);
  });

  it('refuses to complete an already-completed sprint', () => {
    expect(() => assertTransition('complete', SPRINT_STATE.COMPLETED)).toThrow(/must be ACTIVE/);
  });

  it('rejects an unknown action', () => {
    expect(() => assertTransition('teleport', SPRINT_STATE.PLANNED)).toThrow(/Unknown/);
  });

  it('canTransition answers the lookup form', () => {
    expect(canTransition('start', SPRINT_STATE.PLANNED)).toBe(true);
    expect(canTransition('start', SPRINT_STATE.ACTIVE)).toBe(false);
    expect(canTransition('complete', SPRINT_STATE.ACTIVE)).toBe(true);
  });
});
