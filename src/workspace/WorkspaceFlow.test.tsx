import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import App from '../App';
import { dashboardFor, installAppTestHooks, json, seedAuth, workspace } from '../test/appTestUtils';

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
      if (url.endsWith('/workspaces/10/dashboard')) {
        return json(dashboardFor(workspace));
      }
      return json({ error: 'unexpected' }, 500);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'New workspace' }));
    fireEvent.change(await screen.findByLabelText('Workspace name'), { target: { value: 'Product' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

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
      if (url.endsWith('/workspaces/10/dashboard')) {
        return json(dashboardFor(workspace));
      }
      if (url.endsWith('/workspaces/11/sessions')) {
        return json([]);
      }
      if (url.endsWith('/workspaces/11/dashboard')) {
        return json(dashboardFor(secondWorkspace));
      }
      return json({ error: 'unexpected' }, 500);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    fireEvent.change(await screen.findByLabelText('Workspace selector'), { target: { value: '11' } });

    expect(await screen.findByDisplayValue('Platform Council')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/workspaces/11/sessions', expect.any(Object));
  });

  test('search input does not filter workspaces in the rail', async () => {
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
      if (url.endsWith('/workspaces/10/dashboard')) {
        return json(dashboardFor(workspace));
      }
      return json({ error: 'unexpected' }, 500);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    fireEvent.change(await screen.findByLabelText('Search votes'), { target: { value: 'jwt' } });

    expect(screen.getByRole('option', { name: 'Product' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Platform Council' })).toBeInTheDocument();
  });

  test('opens workspace settings as a separate surface', async () => {
    seedAuth();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.endsWith('/workspaces') && !init?.method) {
        return json([workspace]);
      }
      if (url.endsWith('/workspaces/10/sessions')) {
        return json([]);
      }
      if (url.endsWith('/workspaces/10/dashboard')) {
        return json(dashboardFor(workspace));
      }
      return json({ error: 'unexpected' }, 500);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Workspace settings' }));

    expect(await screen.findByText('Members and access')).toBeInTheDocument();
    expect(screen.getByText('Add collaborator')).toBeInTheDocument();
  });

  test('hides decision creation controls for member workspaces', async () => {
    seedAuth();
    const memberWorkspace = { ...workspace, role: 'MEMBER' as const };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.endsWith('/workspaces') && !init?.method) {
        return json([memberWorkspace]);
      }
      if (url.endsWith('/workspaces/10/sessions')) {
        return json([]);
      }
      if (url.endsWith('/workspaces/10/dashboard')) {
        return json(dashboardFor(memberWorkspace));
      }
      return json({ error: 'unexpected' }, 500);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(await screen.findByText('Team Node')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create decision' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ New Decision' })).not.toBeInTheDocument();
  });
});
