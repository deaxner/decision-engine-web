import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import App from './App';
import type { DecisionSession, SessionResult, Workspace } from './types';

const auth = {
  user: { id: '1', email: 'owner@example.test', display_name: 'Owner' },
  token: 'token-1',
};

const workspace: Workspace = {
  id: '10',
  name: 'Product',
  slug: 'product',
  role: 'OWNER',
};

const optionA = { id: '100', title: 'A', position: 1 };
const optionB = { id: '101', title: 'B', position: 2 };

class MockEventSource extends EventTarget {
  static instances: MockEventSource[] = [];
  url: string;

  constructor(url: string) {
    super();
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close = vi.fn();
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function noContent(): Response {
  return new Response(null, { status: 204 });
}

function seedAuth() {
  window.localStorage.setItem('decision-engine-auth', JSON.stringify(auth));
}

beforeEach(() => {
  window.localStorage.clear();
  MockEventSource.instances = [];
  vi.stubGlobal('EventSource', MockEventSource);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Decision Engine web MVP', () => {
  test('auth form stores user and opens the dashboard', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.endsWith('/register')) {
        return json(auth, 201);
      }
      if (url.endsWith('/workspaces')) {
        return json([]);
      }
      return json({ error: 'unexpected' }, 500);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'owner@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-password' } });
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Owner' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Workspace decisions')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('decision-engine-auth') as string)).toEqual(auth);
  });

  test('dashboard creates a workspace', async () => {
    seedAuth();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.endsWith('/workspaces') && !init?.method) {
        return json([]);
      }
      if (url.endsWith('/workspaces') && init?.method === 'POST') {
        return json(workspace, 201);
      }
      if (url.endsWith('/workspaces/10/sessions')) {
        return json([]);
      }
      return json({ error: 'unexpected' }, 500);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'Product' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('Workspace created.')).toBeInTheDocument();
    expect(screen.getAllByText('Product')).not.toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/workspaces',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Product', slug: 'product' }),
      }),
    );
  });

  test('session flow creates ranked sessions, adds draft options, and opens voting', async () => {
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
        currentSession = { ...currentSession, options: [...currentSession.options, { id: `${100 + currentSession.options.length}`, title: body.title, position: currentSession.options.length + 1 }] };
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
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Pick one' } });
    fireEvent.change(screen.getByLabelText('Method'), { target: { value: 'RANKED_IRV' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
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

  test('majority vote submits the expected payload', async () => {
    seedAuth();
    const session: DecisionSession = {
      id: '20',
      title: 'Choose roadmap item',
      description: null,
      status: 'OPEN',
      voting_type: 'MAJORITY',
      starts_at: '2026-04-18T20:00:00+00:00',
      ends_at: null,
      options: [optionA, optionB],
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.endsWith('/workspaces') && !init?.method) {
        return json([workspace]);
      }
      if (url.endsWith('/workspaces/10/sessions')) {
        return json([session]);
      }
      if (url.endsWith('/sessions/20/results')) {
        return noContent();
      }
      if (url.endsWith('/sessions/20/votes')) {
        return json({ vote_id: '500', session_id: '20', status: 'accepted' }, 202);
      }
      return json({ error: 'unexpected' }, 500);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /Choose roadmap item/ }));
    fireEvent.click(screen.getByLabelText('B'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit vote' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/20/votes',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ version: 1, type: 'MAJORITY', data: { choice: '101' } }),
        }),
      ),
    );
  });

  test('ranked vote submits the ordered ranking payload', async () => {
    seedAuth();
    const session: DecisionSession = {
      id: '21',
      title: 'Rank roadmap items',
      description: null,
      status: 'OPEN',
      voting_type: 'RANKED_IRV',
      starts_at: '2026-04-18T20:00:00+00:00',
      ends_at: null,
      options: [optionA, optionB],
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.endsWith('/workspaces') && !init?.method) {
        return json([workspace]);
      }
      if (url.endsWith('/workspaces/10/sessions')) {
        return json([session]);
      }
      if (url.endsWith('/sessions/21/results')) {
        return noContent();
      }
      if (url.endsWith('/sessions/21/votes')) {
        return json({ vote_id: '501', session_id: '21', status: 'accepted' }, 202);
      }
      return json({ error: 'unexpected' }, 500);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /Rank roadmap items/ }));
    fireEvent.click(screen.getByRole('button', { name: 'B' }));
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit ranking' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/21/votes',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ version: 1, type: 'RANKED_IRV', data: { ranking: ['101', '100'] } }),
        }),
      ),
    );
  });

  test('Mercure result updates refetch session and result state', async () => {
    seedAuth();
    const session: DecisionSession = {
      id: '20',
      title: 'Choose roadmap item',
      description: null,
      status: 'OPEN',
      voting_type: 'MAJORITY',
      starts_at: '2026-04-18T20:00:00+00:00',
      ends_at: null,
      options: [optionA, optionB],
    };
    const result: SessionResult = {
      session_id: '20',
      version: 2,
      winning_option_id: '101',
      result_data: {
        winner: '101',
        rounds: [],
        total_votes: 3,
        computed_at: '2026-04-18T20:01:00+00:00',
      },
      calculated_at: '2026-04-18T20:01:00+00:00',
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.endsWith('/workspaces') && !init?.method) {
        return json([workspace]);
      }
      if (url.endsWith('/workspaces/10/sessions')) {
        return json([session]);
      }
      if (url.endsWith('/sessions/20') && !init?.method) {
        return json(session);
      }
      if (url.endsWith('/sessions/20/results')) {
        return json(result);
      }
      return json({ error: 'unexpected' }, 500);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /Choose roadmap item/ }));
    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));

    MockEventSource.instances[0].dispatchEvent(new MessageEvent('result_updated'));

    expect(await screen.findByText('3')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/sessions/20', expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith('/api/sessions/20/results', expect.any(Object));
  });
});
