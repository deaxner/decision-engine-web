import { useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { api } from '../api';
import type { AuthState, DecisionSession, VotingType, Workspace } from '../types';

export type CanvasMode = 'board' | 'detail' | 'settings';

export function useSessionController({
  auth,
  token,
  workspace,
  activeWorkspaceId,
  run,
  setNotice,
  updateWorkspaceSummary,
  refreshWorkspaces,
  refreshDashboard,
  refreshMembers,
}: {
  auth: AuthState | null;
  token: string;
  workspace: Workspace | null;
  activeWorkspaceId: MutableRefObject<string | null>;
  run: (action: () => Promise<void>) => Promise<void>;
  setNotice: (notice: string) => void;
  updateWorkspaceSummary: (workspaceId: string, items: DecisionSession[]) => void;
  refreshWorkspaces: (nextAuth?: AuthState | null, preferredWorkspaceId?: string | null) => Promise<void>;
  refreshDashboard: (currentWorkspace?: Workspace | null) => Promise<void>;
  refreshMembers: (currentWorkspace?: Workspace | null) => Promise<void>;
}) {
  const [createDecisionOpen, setCreateDecisionOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('board');
  const [sessions, setSessions] = useState<DecisionSession[]>([]);
  const [session, setSession] = useState<DecisionSession | null>(null);
  const [sessionsByWorkspace, setSessionsByWorkspace] = useState<Record<string, DecisionSession[]>>({});
  const [loadingSessions, setLoadingSessions] = useState(false);
  const activeSessionId = useRef<string | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const searchResults = normalizedSearchQuery.length === 0
    ? []
    : sessions.filter((item) =>
        `${item.title} ${item.description ?? ''} ${item.status} ${item.voting_type} ${item.category ?? ''} ${(item.assignees ?? []).map((assignee) => assignee.display_name).join(' ')}`
          .toLowerCase()
          .includes(normalizedSearchQuery),
      );

  async function refreshSessions(currentWorkspace = workspace) {
    if (!currentWorkspace || !token) {
      return;
    }
    setLoadingSessions(true);
    try {
      const items = await api.listSessions(token, currentWorkspace.id);
      setSessionsByWorkspace((cache) => ({ ...cache, [currentWorkspace.id]: items }));
      updateWorkspaceSummary(currentWorkspace.id, items);
      if (activeWorkspaceId.current === currentWorkspace.id) {
        setSessions(items);
        setSession((current) => (current ? items.find((item) => item.id === current.id) ?? current : current));
      }
    } finally {
      setLoadingSessions(false);
    }
  }

  async function refreshSession(currentSession = session) {
    if (!currentSession || !token) {
      return;
    }
    const latest = await api.getSession(token, currentSession.id);
    setSession(latest);
  }

  function selectWorkspaceSessions(next: Workspace) {
    activeSessionId.current = null;
    setSessions(sessionsByWorkspace[next.id] ?? []);
    setSession(null);
    setSearchQuery('');
    setCanvasMode('board');
    setCreateDecisionOpen(false);
  }

  function selectSession(next: DecisionSession) {
    activeSessionId.current = next.id;
    setSession(next);
    setSearchQuery('');
    setCanvasMode('detail');
  }

  async function selectSessionById(sessionId: string) {
    const cached = sessions.find((item) => item.id === sessionId);
    if (cached) {
      selectSession(cached);
      return;
    }

    await run(async () => {
      const next = await api.getSession(token, sessionId);
      setSessions((items) => (items.some((item) => item.id === next.id) ? items : [next, ...items]));
      selectSession(next);
    });
  }

  async function createSession(payload: {
    title: string;
    description?: string;
    voting_type: VotingType;
    category?: string;
    due_at?: string;
    assignee_ids?: string[];
    option_titles?: string[];
  }) {
    if (!workspace) {
      return;
    }

    const { option_titles: optionTitles = [], ...sessionPayload } = payload;
    let created = await api.createSession(token, workspace.id, sessionPayload);
    for (const optionTitle of optionTitles) {
      await api.addOption(token, created.id, optionTitle);
    }
    if (optionTitles.length > 0) {
      created = await api.getSession(token, created.id);
    }
    const nextSessions = [created, ...sessions];
    setSessions(nextSessions);
    setSessionsByWorkspace((cache) => ({ ...cache, [workspace.id]: nextSessions }));
    updateWorkspaceSummary(workspace.id, nextSessions);
    setSession(created);
    setCreateDecisionOpen(false);
    setCanvasMode('detail');
    await refreshDashboard(workspace);
    await refreshMembers(workspace);
    setNotice('Decision session created.');
  }

  async function addOption(title: string) {
    if (!workspace || !session) {
      return;
    }

    await api.addOption(token, session.id, title);
    await refreshSession(session);
    await refreshSessions(workspace);
    await refreshDashboard(workspace);
    setNotice('Option added.');
  }

  async function updateSessionStatus(status: 'OPEN' | 'CLOSED') {
    if (!workspace || !session) {
      return;
    }

    const updated = await api.updateSessionStatus(token, session.id, status);
    setSession(updated);
    setSessions((items) => {
      const nextSessions = items.map((item) => (item.id === updated.id ? updated : item));
      updateWorkspaceSummary(workspace.id, nextSessions);
      return nextSessions;
    });
    await refreshSessions(workspace);
    await refreshWorkspaces(auth, workspace.id);
    await refreshDashboard(workspace);
    setNotice(status === 'OPEN' ? 'Voting opened.' : 'Session closed.');
  }

  async function castVote(optionIds: string[]) {
    if (!workspace || !session) {
      return;
    }

    await api.castVote(token, session, optionIds);
    await refreshDashboard(workspace);
    setNotice('Vote accepted. Waiting for the result worker.');
  }

  function clearSessionState() {
    activeSessionId.current = null;
    setCanvasMode('board');
    setSessions([]);
    setSession(null);
    setSessionsByWorkspace({});
    setSearchQuery('');
    setCreateDecisionOpen(false);
  }

  return {
    activeSessionId,
    searchRef,
    createDecisionOpen,
    setCreateDecisionOpen,
    searchQuery,
    setSearchQuery,
    normalizedSearchQuery,
    searchResults,
    canvasMode,
    setCanvasMode,
    sessions,
    session,
    setSession,
    loadingSessions,
    refreshSessions,
    refreshSession,
    selectWorkspaceSessions,
    selectSession,
    selectSessionById,
    createSession,
    addOption,
    updateSessionStatus,
    castVote,
    clearSessionState,
  };
}
