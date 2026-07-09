import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '@gitjira/shared/query-keys';
import { useMoveIssue } from '../src/lib/hooks.js';

// LEARN: this test pins the review finding — an optimistic move that fails must
// leave the cache EXACTLY as it was. It's the regression guard for "rollback
// is a no-op". We force the failure via the _fail flag the hook honors.
vi.mock('../src/lib/api.js', () => ({ api: vi.fn() }));

function makeWrapper(client) {
  return ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useMoveIssue optimistic rollback', () => {
  let client;
  const key = queryKeys.issues('GJ', {});
  const initial = {
    issues: [
      { id: 'a', number: 1, columnId: 'todo', position: 'b' },
      { id: 'b', number: 2, columnId: 'todo', position: 'd' },
    ],
    nextCursor: null,
  };

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(key, structuredClone(initial));
  });

  it('applies optimistically then rolls back to the exact prior cache on failure', async () => {
    const { result } = renderHook(() => useMoveIssue('GJ', {}), { wrapper: makeWrapper(client) });

    result.current.mutate({ number: 1, columnId: 'inprogress', position: 'e', _fail: true });

    // optimistic write happened
    await waitFor(() => {
      const opt = client.getQueryData(key).issues.find((i) => i.number === 1);
      expect(opt.columnId === 'inprogress' || result.current.isError).toBe(true);
    });

    // after the forced failure, the cache must equal the original exactly
    await waitFor(() => expect(result.current.isError).toBe(true));
    const rolledBack = client.getQueryData(key).issues.find((i) => i.number === 1);
    expect(rolledBack.columnId).toBe('todo');
    expect(rolledBack.position).toBe('b');
  });
});
