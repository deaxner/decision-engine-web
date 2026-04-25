import { describe, expect, test } from 'vitest';
import { buildVotePayload, normalizeCreateSessionDraft, normalizeOptionTitle } from './sessionDomain';
import type { DecisionSession } from '../types';

const majoritySession: DecisionSession = {
  id: '20',
  title: 'Choose launch plan',
  description: 'Pick one',
  status: 'OPEN',
  voting_type: 'MAJORITY',
  starts_at: null,
  ends_at: null,
  options: [
    { id: '10', title: 'Option A', position: 1 },
    { id: '11', title: 'Option B', position: 2 },
  ],
};

const rankedSession: DecisionSession = {
  ...majoritySession,
  id: '21',
  voting_type: 'RANKED_IRV',
};

describe('session domain', () => {
  test('normalizes create-session drafts and removes duplicate options', () => {
    expect(
      normalizeCreateSessionDraft({
        title: '  Launch plan  ',
        description: '  Decide once  ',
        voting_type: 'RANKED_IRV',
        category: '  Product  ',
        assignee_ids: ['1'],
        option_titles: ['  Option A ', 'Option B', 'Option A'],
      }),
    ).toEqual({
      title: 'Launch plan',
      description: 'Decide once',
      voting_type: 'RANKED_IRV',
      category: 'Product',
      due_at: undefined,
      assignee_ids: ['1'],
      option_titles: ['Option A', 'Option B'],
    });
  });

  test('rejects create-session drafts with fewer than two unique options', () => {
    expect(() =>
      normalizeCreateSessionDraft({
        title: 'Launch plan',
        voting_type: 'MAJORITY',
        option_titles: ['Only one', 'Only one'],
      }),
    ).toThrow('At least two unique options are required.');
  });

  test('normalizes option titles and rejects empty values', () => {
    expect(normalizeOptionTitle('  Option A  ')).toBe('Option A');
    expect(() => normalizeOptionTitle('   ')).toThrow('Option title is required.');
  });

  test('builds majority vote payloads with exactly one option', () => {
    expect(buildVotePayload(majoritySession, ['10'])).toEqual({
      version: 1,
      type: 'MAJORITY',
      data: { choice: '10' },
    });

    expect(() => buildVotePayload(majoritySession, [])).toThrow('Majority voting requires exactly one option.');
    expect(() => buildVotePayload(majoritySession, ['10', '11'])).toThrow('Majority voting requires exactly one option.');
  });

  test('builds ranked vote payloads and rejects duplicate rankings', () => {
    expect(buildVotePayload(rankedSession, ['10', '11'])).toEqual({
      version: 1,
      type: 'RANKED_IRV',
      data: { ranking: ['10', '11'] },
    });

    expect(() => buildVotePayload(rankedSession, [])).toThrow('Ranked voting requires at least one option.');
    expect(() => buildVotePayload(rankedSession, ['10', '10'])).toThrow('Ranked voting cannot include the same option more than once.');
  });
});
