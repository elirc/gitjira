import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { server } from './msw/server.js';
import { BacklogPage } from '../src/pages/BacklogPage.jsx';

describe('backlog sprint assignment conflict', () => {
  it('sends the issue timestamp and explains a rejected stale change', async () => {
    const updatedAt = '2026-09-19T12:00:00.000Z';
    let requestBody;
    server.use(
      http.get('*/api/projects/GJ/issues', () =>
        HttpResponse.json({
          issues: [
            {
              id: 'issue-1',
              projectId: 'p1',
              number: 1,
              key: 'GJ-1',
              title: 'Keep state current',
              storyPoints: 3,
              sprintId: null,
              updatedAt,
            },
          ],
          nextCursor: null,
        })
      ),
      http.get('*/api/projects/GJ/sprints', () =>
        HttpResponse.json({
          sprints: [
            {
              id: 'sprint-1',
              name: 'Sprint 1',
              goal: null,
              state: 'PLANNED',
              _count: { issues: 0 },
            },
          ],
        })
      ),
      http.patch('*/api/projects/GJ/issues/1/sprint', async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          { error: { message: 'Issue changed since you loaded it; refresh and try again' } },
          { status: 409 }
        );
      })
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/projects/GJ/backlog']}>
          <Routes>
            <Route path="/projects/:key/backlog" element={<BacklogPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await screen.findByText('Keep state current', {}, { timeout: 30000 });
    await userEvent.selectOptions(screen.getByRole('combobox'), 'sprint-1');

    expect(await screen.findByRole('alert', {}, { timeout: 30000 })).toHaveTextContent(
      'Issue changed since you loaded it; refresh and try again'
    );
    expect(requestBody).toEqual({ sprintId: 'sprint-1', expectedUpdatedAt: updatedAt });
  });
});
