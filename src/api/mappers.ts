import type {
  DecisionAssignee,
  DecisionOption,
  DecisionSession,
  SessionResult,
  Workspace,
  WorkspaceActivityEvent,
  WorkspaceDashboard,
  WorkspaceInsight,
  WorkspaceMember,
} from '../types';

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid ${label} response.`);
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Invalid ${label} response.`);
  }

  return value;
}

function asOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asRole(value: unknown): 'OWNER' | 'MEMBER' {
  return value === 'OWNER' ? 'OWNER' : 'MEMBER';
}

function asSessionStatus(value: unknown): DecisionSession['status'] {
  if (value === 'OPEN' || value === 'CLOSED') {
    return value;
  }

  return 'DRAFT';
}

function asVotingType(value: unknown): DecisionSession['voting_type'] {
  return value === 'RANKED_IRV' ? 'RANKED_IRV' : 'MAJORITY';
}

export function normalizeWorkspace(value: unknown): Workspace {
  const raw = asRecord(value, 'workspace');
  const sessionCounts = asRecord(raw.session_counts ?? {}, 'workspace session counts');

  return {
    id: asString(raw.id, 'workspace id'),
    name: asString(raw.name, 'workspace name'),
    slug: asString(raw.slug, 'workspace slug'),
    role: asRole(raw.role),
    member_count: asNumber(raw.member_count),
    participation_rate: asNumber(raw.participation_rate),
    session_counts: {
      total: asNumber(sessionCounts.total),
      draft: asNumber(sessionCounts.draft),
      open: asNumber(sessionCounts.open),
      closed: asNumber(sessionCounts.closed),
    },
  };
}

export function normalizeWorkspaceMember(value: unknown): WorkspaceMember {
  const raw = asRecord(value, 'workspace member');
  return {
    id: asString(raw.id, 'workspace member id'),
    email: asString(raw.email, 'workspace member email'),
    display_name: asString(raw.display_name, 'workspace member display name'),
    role: asRole(raw.role),
  };
}

export function normalizeDecisionOption(value: unknown): DecisionOption {
  const raw = asRecord(value, 'decision option');
  return {
    id: asString(raw.id, 'decision option id'),
    title: asString(raw.title, 'decision option title'),
    position: asNumber(raw.position, 0),
  };
}

function normalizeDecisionAssignee(value: unknown): DecisionAssignee {
  const raw = asRecord(value, 'decision assignee');
  return {
    id: asString(raw.id, 'decision assignee id'),
    display_name: asString(raw.display_name, 'decision assignee display name'),
    email: asString(raw.email, 'decision assignee email'),
  };
}

export function normalizeDecisionSession(value: unknown): DecisionSession {
  const raw = asRecord(value, 'decision session');
  const options = Array.isArray(raw.options) ? raw.options.map(normalizeDecisionOption).sort((a, b) => a.position - b.position) : [];
  const assignees = Array.isArray(raw.assignees) ? raw.assignees.map(normalizeDecisionAssignee) : [];

  return {
    id: asString(raw.id, 'decision session id'),
    title: asString(raw.title, 'decision session title'),
    description: asOptionalString(raw.description),
    status: asSessionStatus(raw.status),
    voting_type: asVotingType(raw.voting_type),
    category: asOptionalString(raw.category),
    due_at: asOptionalString(raw.due_at),
    assignees,
    starts_at: asOptionalString(raw.starts_at),
    ends_at: asOptionalString(raw.ends_at),
    options,
  };
}

function normalizeActivityEvent(value: unknown): WorkspaceActivityEvent {
  const raw = asRecord(value, 'workspace activity');
  const actor = raw.actor ? asRecord(raw.actor, 'workspace activity actor') : null;

  return {
    id: asString(raw.id, 'workspace activity id'),
    type: typeof raw.type === 'string' ? raw.type : 'activity',
    summary: asString(raw.summary, 'workspace activity summary'),
    actor: actor
      ? {
          id: asString(actor.id, 'workspace activity actor id'),
          display_name: asString(actor.display_name, 'workspace activity actor display name'),
        }
      : null,
    workspace_id: asString(raw.workspace_id, 'workspace activity workspace id'),
    session_id: asOptionalString(raw.session_id),
    session_title: asOptionalString(raw.session_title),
    created_at: asString(raw.created_at, 'workspace activity created at'),
    metadata: raw.metadata && typeof raw.metadata === 'object' && !Array.isArray(raw.metadata) ? (raw.metadata as Record<string, unknown>) : {},
  };
}

function normalizeInsight(value: unknown): WorkspaceInsight {
  const raw = asRecord(value, 'workspace insight');
  return {
    id: asString(raw.id, 'workspace insight id'),
    kind: typeof raw.kind === 'string' ? raw.kind : 'insight',
    severity: raw.severity === 'warning' || raw.severity === 'success' ? raw.severity : 'info',
    title: asString(raw.title, 'workspace insight title'),
    body: asString(raw.body, 'workspace insight body'),
    session_id: asOptionalString(raw.session_id),
  };
}

export function normalizeWorkspaceDashboard(value: unknown): WorkspaceDashboard {
  const raw = asRecord(value, 'workspace dashboard');
  const metrics = asRecord(raw.metrics ?? {}, 'workspace dashboard metrics');

  return {
    workspace: normalizeWorkspace(raw.workspace),
    metrics: {
      decision_speed_days: asNullableNumber(metrics.decision_speed_days),
      engagement_rate: asNumber(metrics.engagement_rate),
      active_session_count: asNumber(metrics.active_session_count),
      draft_session_count: asNumber(metrics.draft_session_count),
      closed_session_count: asNumber(metrics.closed_session_count),
    },
    activity: Array.isArray(raw.activity) ? raw.activity.map(normalizeActivityEvent) : [],
    insights: Array.isArray(raw.insights) ? raw.insights.map(normalizeInsight) : [],
  };
}

export function normalizeSessionResult(value: unknown): SessionResult | null {
  if (value === null) {
    return null;
  }

  const raw = asRecord(value, 'session result');
  const resultData = asRecord(raw.result_data ?? {}, 'session result data');
  const rounds = Array.isArray(resultData.rounds)
    ? resultData.rounds.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
    : [];

  return {
    session_id: asString(raw.session_id, 'session result session id'),
    version: asNumber(raw.version, 1),
    winning_option_id: asOptionalString(raw.winning_option_id),
    result_data: {
      winner: asOptionalString(resultData.winner),
      rounds,
      total_votes: asNumber(resultData.total_votes),
      computed_at: asString(resultData.computed_at ?? raw.calculated_at, 'session result computed at'),
    },
    calculated_at: asString(raw.calculated_at ?? resultData.computed_at, 'session result calculated at'),
  };
}
