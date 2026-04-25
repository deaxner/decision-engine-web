import type { DecisionSession, VotingType } from '../types';

export interface CreateSessionDraft {
  title: string;
  description?: string;
  voting_type: VotingType;
  category?: string;
  due_at?: string;
  assignee_ids?: string[];
  option_titles?: string[];
}

export function normalizeCreateSessionDraft(draft: CreateSessionDraft): CreateSessionDraft {
  const title = draft.title.trim();
  if (!title) {
    throw new Error('Decision title is required.');
  }

  const optionTitles = Array.from(new Set((draft.option_titles ?? []).map((item) => item.trim()).filter(Boolean)));
  if (optionTitles.length < 2) {
    throw new Error('At least two unique options are required.');
  }

  return {
    title,
    description: draft.description?.trim() || undefined,
    voting_type: draft.voting_type,
    category: draft.category?.trim() || undefined,
    due_at: draft.due_at,
    assignee_ids: draft.assignee_ids ?? [],
    option_titles: optionTitles,
  };
}

export function normalizeOptionTitle(title: string) {
  const normalized = title.trim();
  if (!normalized) {
    throw new Error('Option title is required.');
  }

  return normalized;
}

export function buildVotePayload(session: DecisionSession, optionIds: string[]) {
  const normalizedOptionIds = optionIds.map((item) => item.trim()).filter(Boolean);
  if (session.voting_type === 'MAJORITY') {
    const [choice] = normalizedOptionIds;
    if (normalizedOptionIds.length !== 1 || !choice) {
      throw new Error('Majority voting requires exactly one option.');
    }

    return {
      version: 1,
      type: 'MAJORITY' as const,
      data: { choice },
    };
  }

  const ranking = Array.from(new Set(normalizedOptionIds));
  if (ranking.length === 0) {
    throw new Error('Ranked voting requires at least one option.');
  }

  if (ranking.length !== normalizedOptionIds.length) {
    throw new Error('Ranked voting cannot include the same option more than once.');
  }

  return {
    version: 1,
    type: 'RANKED_IRV' as const,
    data: { ranking },
  };
}
