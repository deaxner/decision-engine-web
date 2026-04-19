import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import App from '../App';
import type { DecisionSession } from '../types';
import { installAppTestHooks, json, noContent, optionA, optionB, seedAuth, workspace } from '../test/appTestUtils';

installAppTestHooks();

describe('voting flow', () => {
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
});
