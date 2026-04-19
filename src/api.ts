import type { AuthState, DecisionOption, DecisionSession, SessionResult, VotingType, Workspace, WorkspaceDashboard, WorkspaceMember } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return null as T;
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? 'Request failed.');
  }

  return body as T;
}

export const api = {
  register(payload: { email: string; password: string; display_name: string }) {
    return request<AuthState>('/register', { method: 'POST', body: JSON.stringify(payload) });
  },
  login(payload: { email: string; password: string }) {
    return request<AuthState>('/login', { method: 'POST', body: JSON.stringify(payload) });
  },
  listWorkspaces(token: string) {
    return request<Workspace[]>('/workspaces', {}, token);
  },
  createWorkspace(token: string, payload: { name: string; slug: string }) {
    return request<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify(payload) }, token);
  },
  getWorkspace(token: string, id: string) {
    return request<Workspace>(`/workspaces/${id}`, {}, token);
  },
  getWorkspaceDashboard(token: string, id: string) {
    return request<WorkspaceDashboard>(`/workspaces/${id}/dashboard`, {}, token);
  },
  listMembers(token: string, workspaceId: string) {
    return request<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`, {}, token);
  },
  addMember(token: string, workspaceId: string, email: string) {
    return request<{ workspace_id: string; user_id: string; role: 'MEMBER' }>(
      `/workspaces/${workspaceId}/members`,
      { method: 'POST', body: JSON.stringify({ email }) },
      token,
    );
  },
  listSessions(token: string, workspaceId: string) {
    return request<DecisionSession[]>(`/workspaces/${workspaceId}/sessions`, {}, token);
  },
  createSession(
    token: string,
    workspaceId: string,
    payload: {
      title: string;
      description?: string;
      voting_type: VotingType;
      category?: string;
      due_at?: string;
      assignee_ids?: string[];
    },
  ) {
    return request<DecisionSession>(
      `/workspaces/${workspaceId}/sessions`,
      { method: 'POST', body: JSON.stringify(payload) },
      token,
    );
  },
  getSession(token: string, sessionId: string) {
    return request<DecisionSession>(`/sessions/${sessionId}`, {}, token);
  },
  addOption(token: string, sessionId: string, title: string) {
    return request<DecisionOption>(`/sessions/${sessionId}/options`, { method: 'POST', body: JSON.stringify({ title }) }, token);
  },
  updateSessionStatus(token: string, sessionId: string, status: 'OPEN' | 'CLOSED') {
    return request<DecisionSession>(`/sessions/${sessionId}`, { method: 'PATCH', body: JSON.stringify({ status }) }, token);
  },
  castVote(token: string, session: DecisionSession, optionIds: string[]) {
    const payload =
      session.voting_type === 'MAJORITY'
        ? { version: 1, type: 'MAJORITY', data: { choice: optionIds[0] } }
        : { version: 1, type: 'RANKED_IRV', data: { ranking: optionIds } };

    return request<{ vote_id: string; session_id: string; status: 'accepted' }>(
      `/sessions/${session.id}/votes`,
      { method: 'POST', body: JSON.stringify(payload) },
      token,
    );
  },
  getResult(token: string, sessionId: string) {
    return request<SessionResult | null>(`/sessions/${sessionId}/results`, {}, token);
  },
};
