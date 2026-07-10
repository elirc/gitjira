import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from './msw/server.js';
import { useProjects } from '../src/lib/hooks.js';

// LEARN (sprint 11): this is the MSW payoff. The component below uses the REAL
// useProjects hook, which calls the REAL api.js, which calls the REAL fetch —
// only the network response is faked. So loading, success, and error are all
// exercised through production code paths, not stubbed away. Contrast with the
// old `vi.mock('../lib/api.js')` approach, where api.js never ran at all.

function ProjectsList() {
  const { data, isLoading, isError } = useProjects();
  if (isLoading) return <p>Loading…</p>;
  if (isError) return <p role="alert">Couldn’t load projects</p>;
  return (
    <ul>
      {data.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}

function renderWithClient(ui) {
  // retry:false so an error surfaces immediately instead of after retries — the
  // default retry policy is right for prod and wrong for a fast, deterministic test.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('ProjectsList (through real api.js, MSW-mocked network)', () => {
  it('shows a spinner, then the projects from the server', async () => {
    renderWithClient(<ProjectsList />);
    // The real query is pending on first paint.
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    // …then the default handler's data arrives and renders.
    expect(await screen.findByText('GitJira')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
  });

  it('renders the error state when the server 500s', async () => {
    // Per-test override; setup.js resets it afterward so it can't leak.
    server.use(
      http.get('*/api/projects', () =>
        HttpResponse.json({ error: { message: 'boom' } }, { status: 500 })
      )
    );
    renderWithClient(<ProjectsList />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load projects');
  });
});
