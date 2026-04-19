import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import App from '../App';
import { installAppTestHooks, json, seedAuth, workspace } from '../test/appTestUtils';

installAppTestHooks();

describe('workspace flow', () => {
  test('creates a workspace', async () => {
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
    fireEvent.click(screen.getByRole('button', { name: 'Create workspace' }));

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

  test('switches the displayed workspace from the header selector', async () => {
    seedAuth();
    const secondWorkspace = { ...workspace, id: '11', name: 'Platform Council', slug: 'platform-council' };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.endsWith('/workspaces') && !init?.method) {
        return json([workspace, secondWorkspace]);
      }
      if (url.endsWith('/workspaces/10/sessions')) {
        return json([]);
      }
      if (url.endsWith('/workspaces/11/sessions')) {
        return json([]);
      }
      return json({ error: 'unexpected' }, 500);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    fireEvent.change(await screen.findByLabelText('Workspace selector'), { target: { value: '11' } });

    expect(await screen.findByDisplayValue('Platform Council')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/workspaces/11/sessions', expect.any(Object));
  });
});
