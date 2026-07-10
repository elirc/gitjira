import { describe, it, expect } from 'vitest';
import { describeActivity } from '../src/activity.js';

// LEARN: this test locks in the humanizer's output for every `kind` the union
// declares. It's the regression guard that pairs with the type change in
// sprint 10 — the discriminated union stops the *shapes* from drifting at
// compile time; these assertions stop the *sentences* from drifting at runtime.
const alice = { id: 'u1', name: 'Alice' };
const usersById = { u1: alice };

describe('describeActivity', () => {
  it('names the actor from usersById by actorId', () => {
    const s = describeActivity(
      { kind: 'issue.created', payload: { title: 'X' }, actorId: 'u1' },
      usersById
    );
    expect(s).toBe('Alice created this issue');
  });

  it('falls back to the embedded actor, then to "Someone"', () => {
    expect(describeActivity({ kind: 'comment.added', actor: { id: 'u9', name: 'Bob' } })).toBe(
      'Bob commented'
    );
    expect(describeActivity({ kind: 'comment.added' })).toBe('Someone commented');
  });

  it('renders status.changed from the payload from/to', () => {
    const s = describeActivity(
      { kind: 'status.changed', payload: { from: 'To Do', to: 'In Progress' }, actorId: 'u1' },
      usersById
    );
    expect(s).toBe('Alice moved this from To Do to In Progress');
  });

  it('uses an em-dash when a status endpoint is null (e.g. deleted column)', () => {
    const s = describeActivity(
      { kind: 'status.changed', payload: { from: null, to: 'Done' }, actorId: 'u1' },
      usersById
    );
    expect(s).toBe('Alice moved this from — to Done');
  });

  it('renders priority.changed using the new value (to)', () => {
    const s = describeActivity(
      { kind: 'priority.changed', payload: { from: 'LOW', to: 'HIGH' }, actorId: 'u1' },
      usersById
    );
    expect(s).toBe('Alice set priority to HIGH');
  });

  it('summarizes assignee.changed without leaking raw ids', () => {
    const s = describeActivity(
      { kind: 'assignee.changed', payload: { from: null, to: 'u2' }, actorId: 'u1' },
      usersById
    );
    expect(s).toBe('Alice changed the assignee');
  });

  it('fails soft on an unknown/forward-compatible kind', () => {
    // e.g. a notification-only kind (issue.assigned) that leaks into the feed.
    const s = describeActivity(
      // @ts-expect-error — deliberately outside the union: proves the default arm.
      { kind: 'issue.assigned', payload: {}, actorId: 'u1' },
      usersById
    );
    expect(s).toBe('Alice updated this issue');
  });
});
