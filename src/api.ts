import {
  normalizeDecisionOption,
  normalizeDecisionSession,
  normalizeSessionResult,
  normalizeWorkspace,
  normalizeWorkspaceDashboard,
  normalizeWorkspaceMember,
} from './api/mappers';
import { buildVotePayload } from './sessions/sessionDomain';
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
    return request<unknown[]>('/workspaces', {}, token).then((items) => items.map(normalizeWorkspace));
  },
  createWorkspace(token: string, payload: { name: string; slug: string }) {
    return request<unknown>('/workspaces', { method: 'POST', body: JSON.stringify(payload) }, token).then(normalizeWorkspace);
  },
  getWorkspace(token: string, id: string) {
    return request<unknown>(`/workspaces/${id}`, {}, token).then(normalizeWorkspace);
  },
  getWorkspaceDashboard(token: string, id: string) {
    return request<unknown>(`/workspaces/${id}/dashboard`, {}, token).then(normalizeWorkspaceDashboard);
  },
  listMembers(token: string, workspaceId: string) {
    return request<unknown[]>(`/workspaces/${workspaceId}/members`, {}, token).then((items) => items.map(normalizeWorkspaceMember));
  },
  addMember(token: string, workspaceId: string, email: string) {
    return request<{ workspace_id: string; user_id: string; role: 'MEMBER' }>(
      `/workspaces/${workspaceId}/members`,
      { method: 'POST', body: JSON.stringify({ email }) },
      token,
    );
  },
  listSessions(token: string, workspaceId: string) {
    return request<unknown[]>(`/workspaces/${workspaceId}/sessions`, {}, token).then((items) => items.map(normalizeDecisionSession));
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
    ).then(normalizeDecisionSession);
  },
  getSession(token: string, sessionId: string) {
    return request<unknown>(`/sessions/${sessionId}`, {}, token).then(normalizeDecisionSession);
  },
  addOption(token: string, sessionId: string, title: string) {
    return request<unknown>(`/sessions/${sessionId}/options`, { method: 'POST', body: JSON.stringify({ title }) }, token).then(normalizeDecisionOption);
  },
  updateSessionStatus(token: string, sessionId: string, status: 'OPEN' | 'CLOSED') {
    return request<unknown>(`/sessions/${sessionId}`, { method: 'PATCH', body: JSON.stringify({ status }) }, token).then(normalizeDecisionSession);
  },
  castVote(token: string, session: DecisionSession, optionIds: string[]) {
    return request<{ vote_id: string; session_id: string; status: 'accepted' }>(
      `/sessions/${session.id}/votes`,
      { method: 'POST', body: JSON.stringify(buildVotePayload(session, optionIds)) },
      token,
    );
  },
  getResult(token: string, sessionId: string) {
    return request<unknown>(`/sessions/${sessionId}/results`, {}, token).then(normalizeSessionResult);
  },
};
