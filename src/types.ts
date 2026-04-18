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
}

export interface DecisionOption {
  id: string;
  title: string;
  position: number;
}

export interface DecisionSession {
  id: string;
  title: string;
  description: string | null;
  status: SessionStatus;
  voting_type: VotingType;
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
