export type VotingType = 'MAJORITY' | 'RANKED_IRV';
export type SessionStatus = 'DRAFT' | 'OPEN' | 'CLOSED';

export interface User {
  id: string;
  email: string;
  display_name: string;
}

export interface AuthState {
  user: User;
  token: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: 'OWNER' | 'MEMBER';
  member_count: number;
  participation_rate: number;
  session_counts: {
    total: number;
    draft: number;
    open: number;
    closed: number;
  };
}

export interface WorkspaceMember {
  id: string;
  email: string;
  display_name: string;
  role: 'OWNER' | 'MEMBER';
}

export interface WorkspaceDashboard {
  workspace: Workspace;
  metrics: {
    decision_speed_days: number | null;
    engagement_rate: number;
    active_session_count: number;
    draft_session_count: number;
    closed_session_count: number;
  };
  activity: WorkspaceActivityEvent[];
  insights: WorkspaceInsight[];
}

export interface WorkspaceActivityEvent {
  id: string;
  type: string;
  summary: string;
  actor: {
    id: string;
    display_name: string;
  } | null;
  workspace_id: string;
  session_id: string | null;
  session_title: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface WorkspaceInsight {
  id: string;
  kind: string;
  severity: 'info' | 'warning' | 'success';
  title: string;
  body: string;
  session_id: string | null;
}

export interface DecisionOption {
  id: string;
  title: string;
  position: number;
}

export interface DecisionAssignee {
  id: string;
  display_name: string;
  email: string;
}

export interface DecisionSession {
  id: string;
  title: string;
  description: string | null;
  status: SessionStatus;
  voting_type: VotingType;
  category?: string | null;
  due_at?: string | null;
  assignees?: DecisionAssignee[];
  starts_at: string | null;
  ends_at: string | null;
  options: DecisionOption[];
}

export interface SessionResult {
  session_id: string;
  version: number;
  winning_option_id: string | null;
  result_data: {
    winner: string | null;
    rounds: Array<Record<string, unknown>>;
    total_votes: number;
    computed_at: string;
  };
  calculated_at: string;
}
