import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import App from '../App';
import type { DecisionSession } from '../types';
import { installAppTestHooks, json, seedAuth, workspace } from '../test/appTestUtils';

installAppTestHooks();

describe('session flow', () => {
  test('creates ranked sessions, adds draft options, and opens voting', async () => {
    seedAuth();
    let currentSession: DecisionSession = {
      id: '20',
      title: 'Choose launch plan',
      description: 'Pick one',
      status: 'DRAFT',
      voting_type: 'RANKED_IRV',
      starts_at: null,
      ends_at: null,
      options: [],
    };
    let sessions: DecisionSession[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.endsWith('/workspaces') && !init?.method) {
        return json([workspace]);
      }
      if (url.endsWith('/workspaces/10/sessions') && !init?.method) {
        return json(sessions);
      }
      if (url.endsWith('/workspaces/10/sessions') && init?.method === 'POST') {
        sessions = [currentSession];
        return json(currentSession, 201);
      }
      if (url.endsWith('/sessions/20/options')) {
        const body = JSON.parse(init?.body as string);
        currentSession = {
          ...currentSession,
          options: [...currentSession.options, { id: `${100 + currentSession.options.length}`, title: body.title, position: currentSession.options.length + 1 }],
        };
        sessions = [currentSession];
        return json(currentSession.options.at(-1), 201);
      }
      if (url.endsWith('/sessions/20') && !init?.method) {
        return json(currentSession);
      }
      if (url.endsWith('/sessions/20') && init?.method === 'PATCH') {
        currentSession = { ...currentSession, status: 'OPEN', starts_at: '2026-04-18T20:00:00+00:00' };
        sessions = [currentSession];
        return json(currentSession);
      }
      return json({ error: 'unexpected' }, 500);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    fireEvent.change(await screen.findByLabelText('Decision title'), { target: { value: 'Choose launch plan' } });
    fireEvent.change(screen.getByLabelText('Strategic notes'), { target: { value: 'Pick one' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByLabelText('Method'), { target: { value: 'RANKED_IRV' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Propose decision' }));
    expect(await screen.findByText('Decision session created.')).toBeInTheDocument();
    expect(screen.getAllByText('Choose launch plan')).not.toHaveLength(0);

    fireEvent.change(screen.getByLabelText('Option title'), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add option' }));
    await screen.findByText('A');
    fireEvent.change(screen.getByLabelText('Option title'), { target: { value: 'B' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add option' }));
    await screen.findByText('B');
    fireEvent.click(screen.getByRole('button', { name: 'Open voting' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/sessions/20', expect.objectContaining({ method: 'PATCH' })));
  });

  test('filters the decision board between active and archived sessions', async () => {
    seedAuth();
    const sessions: DecisionSession[] = [
      {
        id: '20',
        title: 'Choose launch plan',
        description: 'Pick one',
        status: 'OPEN',
        voting_type: 'MAJORITY',
        starts_at: '2026-04-18T20:00:00+00:00',
        ends_at: null,
        options: [],
      },
      {
        id: '21',
        title: 'Archive retention policy',
        description: 'Historic governance choice',
        status: 'CLOSED',
        voting_type: 'RANKED_IRV',
        starts_at: '2026-04-17T20:00:00+00:00',
        ends_at: '2026-04-18T20:00:00+00:00',
        options: [],
      },
    ];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.endsWith('/workspaces') && !init?.method) {
        return json([{ ...workspace, participation_rate: 50, session_counts: { total: 2, draft: 0, open: 1, closed: 1 } }]);
      }
      if (url.endsWith('/workspaces/10/sessions')) {
        return json(sessions);
      }
      return json({ error: 'unexpected' }, 500);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(await screen.findByText('Choose launch plan')).toBeInTheDocument();
    expect(screen.queryByText('Archive retention policy')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Archived' }));

    expect(await screen.findByText('Archive retention policy')).toBeInTheDocument();
    expect(screen.queryByText('Choose launch plan')).not.toBeInTheDocument();
  });
});
