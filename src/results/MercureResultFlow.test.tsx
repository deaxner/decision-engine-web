import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import App from '../App';
import type { DecisionSession, SessionResult } from '../types';
import { installAppTestHooks, json, MockEventSource, optionA, optionB, seedAuth, workspace } from '../test/appTestUtils';

installAppTestHooks();

describe('Mercure result flow', () => {
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
        rounds: [{ type: 'MAJORITY', counts: { '100': 1, '101': 2 } }],
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
    expect(screen.getByText('Result breakdown')).toBeInTheDocument();
    expect(screen.getAllByText('A').length).toBeGreaterThan(1);
    expect(screen.getAllByText('B').length).toBeGreaterThan(1);
    expect(screen.getByText('Winner')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/sessions/20', expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith('/api/sessions/20/results', expect.any(Object));
  });
});
