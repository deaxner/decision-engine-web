import { describe, expect, test } from 'vitest';
import { summarizeSessions, selectPreferredWorkspace } from './workspaceDomain';
import type { DecisionSession, Workspace } from '../types';

const productWorkspace: Workspace = {
  id: '10',
  name: 'Product',
  slug: 'product',
  role: 'OWNER',
  member_count: 1,
  participation_rate: 0,
  session_counts: { total: 0, draft: 0, open: 0, closed: 0 },
};

const platformWorkspace: Workspace = {
  ...productWorkspace,
  id: '11',
  name: 'Platform',
  slug: 'platform',
};

describe('workspace domain', () => {
  test('summarizes session counts by status', () => {
    const sessions: DecisionSession[] = [
      { id: '1', title: 'A', description: null, status: 'DRAFT', voting_type: 'MAJORITY', starts_at: null, ends_at: null, options: [] },
      { id: '2', title: 'B', description: null, status: 'OPEN', voting_type: 'MAJORITY', starts_at: null, ends_at: null, options: [] },
      { id: '3', title: 'C', description: null, status: 'CLOSED', voting_type: 'RANKED_IRV', starts_at: null, ends_at: null, options: [] },
    ];

    expect(summarizeSessions(sessions)).toEqual({ total: 3, draft: 1, open: 1, closed: 1 });
  });

  test('selects the preferred workspace before falling back', () => {
    const workspaces = [productWorkspace, platformWorkspace];

    expect(selectPreferredWorkspace({ workspaces, preferredWorkspaceId: '11', activeWorkspaceId: '10', currentWorkspaceId: '10' })).toEqual(platformWorkspace);
    expect(selectPreferredWorkspace({ workspaces, activeWorkspaceId: '11', currentWorkspaceId: '10' })).toEqual(platformWorkspace);
    expect(selectPreferredWorkspace({ workspaces, currentWorkspaceId: '10' })).toEqual(productWorkspace);
    expect(selectPreferredWorkspace({ workspaces: [] })).toBeNull();
  });
});
