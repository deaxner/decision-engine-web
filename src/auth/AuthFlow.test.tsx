import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import App from '../App';
import { auth, installAppTestHooks, json } from '../test/appTestUtils';

installAppTestHooks();

describe('auth flow', () => {
  test('stores user and opens the dashboard from login', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.endsWith('/login')) {
        return json(auth);
      }
      if (url.endsWith('/workspaces')) {
        return json([]);
      }
      return json({ error: 'unexpected' }, 500);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    expect(screen.getAllByText('Decision Ledger').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Enter workspace' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Display name')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /github/i })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Workspace email'), { target: { value: 'owner@example.test' } });
    fireEvent.change(screen.getByLabelText('Security key'), { target: { value: 'secret-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enter workspace' }));

    expect(await screen.findByText('Workspace decisions')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('decision-engine-auth') as string)).toEqual(auth);
  });

  test('register mode remains email and password only', async () => {
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
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(screen.getByLabelText('Display name')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /github/i })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Workspace email'), { target: { value: 'owner@example.test' } });
    fireEvent.change(screen.getByLabelText('Security key'), { target: { value: 'secret-password' } });
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Owner' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create ledger account' }));

    expect(await screen.findByText('Workspace decisions')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/register',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'owner@example.test', password: 'secret-password', display_name: 'Owner' }),
      }),
    );
  });
});
