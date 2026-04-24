import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import App from '../App';
import type { DecisionSession } from '../types';
import { dashboardFor, installAppTestHooks, json, seedAuth, workspace } from '../test/appTestUtils';

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
      if (url.endsWith('/workspaces/10/dashboard')) {
        return json(dashboardFor({ ...workspace, session_counts: { total: sessions.length, draft: sessions.filter((item) => item.status === 'DRAFT').length, open: sessions.filter((item) => item.status === 'OPEN').length, closed: sessions.filter((item) => item.status === 'CLOSED').length } }));
      }
      if (url.endsWith('/workspaces/10/members')) {
        return json([
          { id: '1', email: 'owner@example.test', display_name: 'Owner', role: 'OWNER' },
          { id: '2', email: 'member@example.test', display_name: 'Member User', role: 'MEMBER' },
        ]);
      }
      if (url.endsWith('/workspaces/10/sessions') && init?.method === 'POST') {
        const body = JSON.parse(init.body as string);
        currentSession = {
          ...currentSession,
          category: body.category,
          due_at: body.due_at,
          assignees: [{ id: '2', email: 'member@example.test', display_name: 'Member User' }],
        };
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
    fireEvent.click(await screen.findByRole('button', { name: 'Create decision' }));
    fireEvent.change(await screen.findByLabelText('Decision title'), { target: { value: 'Choose launch plan' } });
    fireEvent.change(screen.getByLabelText('Category / node'), { target: { value: 'Product' } });
    fireEvent.change(screen.getByLabelText('Strategic notes'), { target: { value: 'Pick one' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByLabelText('Method'), { target: { value: 'RANKED_IRV' } });
    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2026-04-28' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getAllByRole('button', { name: 'Create decision' })[1]).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Option 1'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Option 2'), { target: { value: 'B' } });
    expect(screen.getAllByRole('button', { name: 'Create decision' })[1]).not.toBeDisabled();
    fireEvent.click(screen.getByLabelText(/Member User/i));
    fireEvent.click(screen.getAllByRole('button', { name: 'Create decision' })[1]);
    expect(await screen.findByText('Decision session created.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/sessions/20/options', expect.objectContaining({ body: expect.stringContaining('"title":"A"') }));
    expect(fetchMock).toHaveBeenCalledWith('/api/sessions/20/options', expect.objectContaining({ body: expect.stringContaining('"title":"B"') }));
    expect(screen.getAllByText('Choose launch plan')).not.toHaveLength(0);
    expect(screen.getAllByText('Product').length).toBeGreaterThan(1);
    expect(screen.getByText('Member User')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/workspaces/10/sessions',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"category":"Product"'),
      }),
    );

    fireEvent.change(screen.getByLabelText('Option title'), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add option' }));
    await screen.findByText('A');
    fireEvent.change(screen.getByLabelText('Option title'), { target: { value: 'B' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add option' }));
    await screen.findByText('B');
    fireEvent.click(screen.getByRole('button', { name: 'Open voting' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/sessions/20', expect.objectContaining({ method: 'PATCH' })));
  });

  test('renders board tabs and opens detail on selection', async () => {
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
      if (url.endsWith('/workspaces/10/dashboard')) {
        return json(dashboardFor(
          { ...workspace, participation_rate: 50, session_counts: { total: 2, draft: 0, open: 1, closed: 1 } },
          {
            metrics: {
              decision_speed_days: 4.2,
              engagement_rate: 50,
              active_session_count: 1,
              draft_session_count: 0,
              closed_session_count: 1,
            },
            activity: [
              {
                id: '900',
                type: 'voting_opened',
                summary: 'Owner opened voting for Choose launch plan.',
                actor: { id: '1', display_name: 'Owner' },
                workspace_id: '10',
                session_id: '20',
                session_title: 'Choose launch plan',
                created_at: '2026-04-19T19:42:00+00:00',
                metadata: {},
              },
            ],
            insights: [
              {
                id: 'decision-record-growing',
                kind: 'archive',
                severity: 'success',
                title: 'Decision record is growing',
                body: '1 closed decisions are retained as accountable history.',
                session_id: null,
              },
            ],
          },
        ));
      }
      return json({ error: 'unexpected' }, 500);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(await screen.findByText('Choose launch plan')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Active Decisions' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Draft Items' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Archived Log' })).toBeInTheDocument();
    expect(screen.getByText('Recent Insights')).toBeInTheDocument();
    expect(screen.getByText('4.2 Days')).toBeInTheDocument();
    expect(screen.getByText('50% Engagement')).toBeInTheDocument();
    expect(screen.getByText('Decision record is growing')).toBeInTheDocument();
    expect(screen.getByText(/opened voting for Choose launch plan/i)).toBeInTheDocument();
    expect(screen.queryByText(/Node:/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Archived Log' }));
    fireEvent.click(screen.getByRole('button', { name: /Archive retention policy/i }));

    expect(await screen.findByRole('button', { name: 'Back to board' })).toBeInTheDocument();
    expect(screen.getByText('Consensus monitor')).toBeInTheDocument();
  });

  test('dashboard activity can open a linked decision', async () => {
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
    ];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.endsWith('/workspaces') && !init?.method) {
        return json([{ ...workspace, session_counts: { total: 1, draft: 0, open: 1, closed: 0 } }]);
      }
      if (url.endsWith('/workspaces/10/sessions')) {
        return json(sessions);
      }
      if (url.endsWith('/workspaces/10/dashboard')) {
        return json(dashboardFor(
          { ...workspace, session_counts: { total: 1, draft: 0, open: 1, closed: 0 } },
          {
            activity: [
              {
                id: '900',
                type: 'vote_cast',
                summary: 'Owner cast a vote on Choose launch plan.',
                actor: { id: '1', display_name: 'Owner' },
                workspace_id: '10',
                session_id: '20',
                session_title: 'Choose launch plan',
                created_at: '2026-04-19T19:42:00+00:00',
                metadata: {},
              },
            ],
          },
        ));
      }
      if (url.endsWith('/sessions/20/results')) {
        return json(null);
      }
      return json({ error: 'unexpected' }, 500);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: /cast a vote on Choose launch plan/i }));
    expect(await screen.findByText('Consensus monitor')).toBeInTheDocument();
  });

  test('search results can open a matching decision directly', async () => {
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
        options: [{ id: '10', title: 'Option A', position: 1 }],
      },
      {
        id: '21',
        title: 'Archive retention policy',
        description: 'Historic governance choice',
        status: 'CLOSED',
        voting_type: 'RANKED_IRV',
        starts_at: '2026-04-17T20:00:00+00:00',
        ends_at: '2026-04-18T20:00:00+00:00',
        options: [{ id: '11', title: 'Keep 1 year', position: 1 }],
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
      if (url.endsWith('/workspaces/10/dashboard')) {
        return json(dashboardFor({ ...workspace, participation_rate: 50, session_counts: { total: 2, draft: 0, open: 1, closed: 1 } }));
      }
      if (url.endsWith('/sessions/21') && !init?.method) {
        return json(sessions[1]);
      }
      if (url.endsWith('/sessions/21/result')) {
        return json({
          session_id: '21',
          version: 1,
          winning_option_id: '11',
          result_data: {
            total_votes: 1,
            rounds: [{ type: 'MAJORITY', counts: { 11: 1 } }],
          },
        });
      }
      return json({ error: 'unexpected' }, 500);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    fireEvent.change(await screen.findByLabelText('Search votes'), { target: { value: 'archive' } });
    fireEvent.click((await screen.findByRole('list', { name: 'Vote search results' })).querySelector('button') as HTMLButtonElement);

    expect(await screen.findAllByText('Archive retention policy')).not.toHaveLength(0);
    expect(await screen.findByText('Consensus monitor')).toBeInTheDocument();
  });
});
