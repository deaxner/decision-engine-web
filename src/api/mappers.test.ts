import { describe, expect, test } from 'vitest';
import {
  normalizeDecisionSession,
  normalizeSessionResult,
  normalizeWorkspace,
  normalizeWorkspaceDashboard,
} from './mappers';

describe('api mappers', () => {
  test('normalizes workspaces with defensive numeric defaults', () => {
    expect(
      normalizeWorkspace({
        id: '10',
        name: 'Product',
        slug: 'product',
        role: 'OWNER',
        member_count: 'bad',
        participation_rate: null,
        session_counts: { total: 2, open: 1 },
      }),
    ).toEqual({
      id: '10',
      name: 'Product',
      slug: 'product',
      role: 'OWNER',
      member_count: 0,
      participation_rate: 0,
      session_counts: { total: 2, draft: 0, open: 1, closed: 0 },
    });
  });

  test('normalizes sessions with sorted options and safe optional fields', () => {
    expect(
      normalizeDecisionSession({
        id: '20',
        title: 'Choose launch plan',
        description: '',
        status: 'OPEN',
        voting_type: 'RANKED_IRV',
        options: [
          { id: '11', title: 'Option B', position: 2 },
          { id: '10', title: 'Option A', position: 1 },
        ],
      }),
    ).toMatchObject({
      id: '20',
      title: 'Choose launch plan',
      description: null,
      status: 'OPEN',
      voting_type: 'RANKED_IRV',
      options: [
        { id: '10', title: 'Option A', position: 1 },
        { id: '11', title: 'Option B', position: 2 },
      ],
      assignees: [],
    });
  });

  test('normalizes dashboard metrics and collections with defaults', () => {
    expect(
      normalizeWorkspaceDashboard({
        workspace: {
          id: '10',
          name: 'Product',
          slug: 'product',
          role: 'OWNER',
          member_count: 1,
          participation_rate: 42,
          session_counts: {},
        },
        metrics: {
          engagement_rate: 67,
        },
      }),
    ).toMatchObject({
      workspace: { id: '10', name: 'Product' },
      metrics: {
        decision_speed_days: null,
        engagement_rate: 67,
        active_session_count: 0,
        draft_session_count: 0,
        closed_session_count: 0,
      },
      activity: [],
      insights: [],
    });
  });

  test('normalizes null results and uses computed time fallbacks', () => {
    expect(normalizeSessionResult(null)).toBeNull();
    expect(
      normalizeSessionResult({
        session_id: '20',
        version: 1,
        winning_option_id: '10',
        calculated_at: '2026-04-24T12:00:00+00:00',
        result_data: {
          total_votes: 2,
          rounds: [{ type: 'MAJORITY' }, []],
        },
      }),
    ).toEqual({
      session_id: '20',
      version: 1,
      winning_option_id: '10',
      result_data: {
        winner: null,
        rounds: [{ type: 'MAJORITY' }],
        total_votes: 2,
        computed_at: '2026-04-24T12:00:00+00:00',
      },
      calculated_at: '2026-04-24T12:00:00+00:00',
    });
  });

  test('rejects invalid top-level payloads', () => {
    expect(() => normalizeWorkspace({})).toThrow('Invalid workspace id response.');
    expect(() => normalizeDecisionSession([])).toThrow('Invalid decision session response.');
  });
});
