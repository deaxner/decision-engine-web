import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import { AuthLanding } from './auth/AuthLanding';
import { slugify } from './lib/slugify';
import { SessionBoard } from './sessions/SessionBoard';
import { SessionDetail } from './sessions/SessionDetail';
import { EmptyState } from './shared/EmptyState';
import { StatusBar } from './shared/StatusBar';
import { clearAuth, loadAuth, saveAuth } from './storage';
import type { AuthState, DecisionSession, SessionResult, Workspace, WorkspaceDashboard, WorkspaceMember } from './types';
import { WorkspaceHeader } from './workspace/WorkspaceHeader';
import { WorkspacePanel } from './workspace/WorkspacePanel';
import { WorkspaceSettingsPanel } from './workspace/WorkspaceSettingsPanel';
import './styles/base.css';
import './styles/app-shell.css';

const MERCURE_URL = import.meta.env.VITE_MERCURE_URL ?? 'http://127.0.0.1:3001/.well-known/mercure';

function summarizeSessions(items: DecisionSession[]) {
  return items.reduce(
    (summary, item) => {
      summary.total += 1;
      if (item.status === 'DRAFT') {
        summary.draft += 1;
      } else if (item.status === 'OPEN') {
        summary.open += 1;
      } else {
        summary.closed += 1;
      }

      return summary;
    },
    { total: 0, draft: 0, open: 0, closed: 0 },
  );
}

type CanvasMode = 'board' | 'detail' | 'settings';

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(() => loadAuth());
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [createDecisionOpen, setCreateDecisionOpen] = useState(false);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('board');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [sessions, setSessions] = useState<DecisionSession[]>([]);
  const [session, setSession] = useState<DecisionSession | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [dashboard, setDashboard] = useState<WorkspaceDashboard | null>(null);
  const [sessionsByWorkspace, setSessionsByWorkspace] = useState<Record<string, DecisionSession[]>>({});
  const [membersByWorkspace, setMembersByWorkspace] = useState<Record<string, WorkspaceMember[]>>({});
  const [resultsBySession, setResultsBySession] = useState<Record<string, SessionResult | null>>({});
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [loadingResult, setLoadingResult] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const activeWorkspaceId = useRef<string | null>(null);
  const activeSessionId = useRef<string | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);

  const token = auth?.token ?? '';
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const searchResults = normalizedSearchQuery.length === 0
    ? []
    : sessions.filter((item) =>
        `${item.title} ${item.description ?? ''} ${item.status} ${item.voting_type} ${item.category ?? ''} ${(item.assignees ?? []).map((assignee) => assignee.display_name).join(' ')}`.toLowerCase().includes(normalizedSearchQuery),
      );
  const openSessions = workspace?.session_counts.open ?? sessions.filter((item) => item.status === 'OPEN').length;

  async function run(action: () => Promise<void>) {
    setError('');
    try {
      await action();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Something went wrong.');
    }
  }

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timeout = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!error) {
      return;
    }
    const timeout = window.setTimeout(() => setError(''), 4200);
    return () => window.clearTimeout(timeout);
  }, [error]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSearchQuery('');
      }
    }

    if (!normalizedSearchQuery) {
      return;
    }

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [normalizedSearchQuery]);

  function updateWorkspaceSummary(workspaceId: string, items: DecisionSession[]) {
    const sessionCounts = summarizeSessions(items);
    setWorkspaces((current) =>
      current.map((item) => (item.id === workspaceId ? { ...item, session_counts: sessionCounts } : item)),
    );
    setWorkspace((current) => (current && current.id === workspaceId ? { ...current, session_counts: sessionCounts } : current));
  }

  async function refreshWorkspaces(nextAuth = auth, preferredWorkspaceId?: string | null) {
    if (!nextAuth) {
      return;
    }
    const items = await api.listWorkspaces(nextAuth.token);
    setWorkspaces(items);
    const nextWorkspaceId = preferredWorkspaceId ?? activeWorkspaceId.current ?? workspace?.id ?? null;
    const nextWorkspace = items.find((item) => item.id === nextWorkspaceId) ?? items[0] ?? null;
    setWorkspace(nextWorkspace);
  }

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

  async function refreshDashboard(currentWorkspace = workspace) {
    if (!currentWorkspace || !token) {
      return;
    }
    setLoadingDashboard(true);
    setDashboardError('');
    try {
      const latest = await api.getWorkspaceDashboard(token, currentWorkspace.id);
      if (activeWorkspaceId.current === currentWorkspace.id) {
        setDashboard(latest);
        setWorkspace(latest.workspace);
        setWorkspaces((items) => items.map((item) => (item.id === latest.workspace.id ? latest.workspace : item)));
      }
    } catch (exception) {
      setDashboardError(exception instanceof Error ? exception.message : 'Could not load dashboard.');
    } finally {
      setLoadingDashboard(false);
    }
  }

  async function refreshMembers(currentWorkspace = workspace) {
    if (!currentWorkspace || !token) {
      return;
    }
    setLoadingMembers(true);
    try {
      const members = await api.listMembers(token, currentWorkspace.id);
      setMembersByWorkspace((cache) => ({ ...cache, [currentWorkspace.id]: members }));
      if (activeWorkspaceId.current === currentWorkspace.id) {
        setWorkspaceMembers(members);
      }
    } catch {
      if (activeWorkspaceId.current === currentWorkspace.id) {
        setWorkspaceMembers([]);
      }
    } finally {
      setLoadingMembers(false);
    }
  }

  async function refreshSession(currentSession = session) {
    if (!currentSession || !token) {
      return;
    }
    const latest = await api.getSession(token, currentSession.id);
    setSession(latest);
  }

  async function refreshResult(currentSession = session) {
    if (!currentSession || !token || currentSession.status === 'DRAFT') {
      setResult(null);
      return;
    }
    setLoadingResult(true);
    try {
      const latest = await api.getResult(token, currentSession.id);
      setResultsBySession((cache) => ({ ...cache, [currentSession.id]: latest }));
      if (activeSessionId.current === currentSession.id) {
        setResult(latest);
      }
    } finally {
      setLoadingResult(false);
    }
  }

  useEffect(() => {
    if (auth) {
      void run(() => refreshWorkspaces(auth));
    }
  }, []);

  useEffect(() => {
    activeWorkspaceId.current = workspace?.id ?? null;
    void run(refreshSessions);
    void refreshDashboard();
    void refreshMembers();
  }, [workspace?.id]);

  useEffect(() => {
    activeSessionId.current = session?.id ?? null;
    void run(refreshResult);
  }, [session?.id, session?.status]);

  useEffect(() => {
    if (!session || session.status === 'DRAFT' || !token) {
      return;
    }

    const url = `${MERCURE_URL}?topic=${encodeURIComponent(`/sessions/${session.id}/results`)}`;
    const events = new EventSource(url);
    events.addEventListener('result_updated', () => {
      void run(async () => {
        await refreshSession(session);
        await refreshResult(session);
        await refreshWorkspaces(auth, workspace?.id);
        await refreshDashboard(workspace);
      });
    });

    return () => events.close();
  }, [session?.id, session?.status, token]);

  function acceptAuth(nextAuth: AuthState) {
    saveAuth(nextAuth);
    setAuth(nextAuth);
    setNotice(`Signed in as ${nextAuth.user.display_name}`);
    void run(() => refreshWorkspaces(nextAuth));
  }

  function signOut() {
    clearAuth();
    setAuth(null);
    setCanvasMode('board');
    setWorkspaces([]);
    setWorkspace(null);
    setSessions([]);
    setSession(null);
    setResult(null);
    setDashboard(null);
    setWorkspaceMembers([]);
    setMembersByWorkspace({});
  }

  function selectWorkspaceById(workspaceId: string) {
    const next = workspaces.find((item) => item.id === workspaceId);
    if (!next) {
      return;
    }
    activeWorkspaceId.current = next.id;
    activeSessionId.current = null;
    setWorkspace(next);
    setSessions(sessionsByWorkspace[next.id] ?? []);
    setWorkspaceMembers(membersByWorkspace[next.id] ?? []);
    setSession(null);
    setResult(null);
    setDashboard(null);
    setDashboardError('');
    setSearchQuery('');
    setCanvasMode('board');
    setCreateDecisionOpen(false);
    setCreateWorkspaceOpen(false);
  }

  function selectSession(next: DecisionSession) {
    activeSessionId.current = next.id;
    setSession(next);
    setResult(resultsBySession[next.id] ?? null);
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

  if (!auth) {
    return (
      <main className="auth-shell">
        <AuthLanding notice={notice} error={error} onAuth={acceptAuth} onError={setError} />
      </main>
    );
  }

  return (
    <main className={railCollapsed ? 'app-shell app-shell-auth rail-collapsed' : 'app-shell app-shell-auth'}>
      <header className="oracle-topbar">
        <div className="oracle-brand">
          <button
            className="icon-button rail-toggle"
            aria-label={railCollapsed ? 'Expand workspace rail' : 'Collapse workspace rail'}
            onClick={() => setRailCollapsed((current) => !current)}
            type="button"
          >
            {railCollapsed ? '>' : '<'}
          </button>
          <strong>Decision Ledger</strong>
          <div className="oracle-search" ref={searchRef}>
            <input
              aria-label="Search votes"
              placeholder="Search votes..."
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {normalizedSearchQuery ? (
              <ul className="search-results" aria-label="Vote search results">
                {searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <li key={item.id}>
                      <button className="search-result-button" type="button" onClick={() => selectSession(item)}>
                        <span className="search-result-copy">
                          <strong>{item.title}</strong>
                          <small>{item.description || 'No summary provided yet.'}</small>
                        </span>
                        <small className={`search-result-status search-result-status-${item.status.toLowerCase()}`}>{item.status}</small>
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="search-results-empty">No matching votes.</li>
                )}
              </ul>
            ) : null}
          </div>
        </div>
        <nav className="oracle-nav" aria-label="Primary">
          <a href="#workspaces" className="active">
            Workspaces
          </a>
          <a href="#insights">Insights</a>
          <a href="#archive">Archive</a>
          <a href="#settings">Settings</a>
        </nav>
        <div className="oracle-actions">
          <button className="icon-button" aria-label="Notifications" type="button">
            N
          </button>
          <button className="icon-button" aria-label="Help" type="button">
            ?
          </button>
          <div className="profile-chip" aria-label={`Signed in as ${auth.user.display_name}`}>
            {auth.user.display_name.slice(0, 1).toUpperCase()}
          </div>
          <button className="ghost-button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>
      <aside className={railCollapsed ? 'workspace-rail collapsed' : 'workspace-rail'}>
        <div className="rail-header">
          <div className="rail-badge">DL</div>
          <div>
            <h2>Workspaces</h2>
            <p className="small-heading">Active nodes</p>
          </div>
        </div>
        <div className="rail-meta">
          <span>{workspaces.length} total</span>
          <span>{openSessions} open sessions</span>
        </div>
        <div className="rail-panel">
          <WorkspacePanel
            collapsed={railCollapsed}
            workspaces={workspaces}
            active={workspace}
            onSelect={(next) => selectWorkspaceById(next.id)}
            onCreateDecision={() => setCreateDecisionOpen(true)}
          />
        </div>
      </aside>

      <section className="app-canvas">
        <div className="canvas-shell">
          <StatusBar notice={notice} error={error} />
          {workspace ? (
            <>
              <div className="breadcrumb-trail" aria-label="Breadcrumb">
                <span>Workspaces</span>
                <span>/</span>
                <span>{workspace.name}</span>
                {canvasMode === 'settings' ? (
                  <>
                    <span>/</span>
                    <span>Settings</span>
                  </>
                ) : null}
                {canvasMode === 'detail' && session ? (
                  <>
                    <span>/</span>
                    <span>{session.title}</span>
                  </>
                ) : null}
              </div>
              <WorkspaceHeader
                workspace={workspace}
                mode={canvasMode}
                onCreateDecision={() => setCreateDecisionOpen(true)}
                onOpenSettings={() => setCanvasMode('settings')}
                onOpenCreateWorkspace={() => setCreateWorkspaceOpen(true)}
                onBackToBoard={() => setCanvasMode('board')}
              />
              {canvasMode === 'board' ? (
                <SessionBoard
                  workspace={workspace}
                  sessions={sessions}
                  active={session}
                  loading={loadingSessions}
                  dashboard={dashboard}
                  loadingDashboard={loadingDashboard}
                  dashboardError={dashboardError}
                  members={workspaceMembers}
                  loadingMembers={loadingMembers}
                  createOpen={createDecisionOpen}
                  onCreateOpenChange={setCreateDecisionOpen}
                  onSelect={selectSession}
                  onSelectActivitySession={selectSessionById}
                  onRetryDashboard={() => void refreshDashboard(workspace)}
                  onCreate={(payload) =>
                    run(async () => {
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
                      setResult(null);
                      setCreateDecisionOpen(false);
                      setCanvasMode('detail');
                      await refreshDashboard(workspace);
                      await refreshMembers(workspace);
                      setNotice('Decision session created.');
                    })
                  }
                />
              ) : null}
              {canvasMode === 'detail' && session ? (
                <SessionDetail
                  session={session}
                  result={result}
                  loadingResult={loadingResult}
                  onAddOption={(title) =>
                    run(async () => {
                      await api.addOption(token, session.id, title);
                      await refreshSession(session);
                      await refreshSessions(workspace);
                      await refreshDashboard(workspace);
                      setNotice('Option added.');
                    })
                  }
                  onStatus={(status) =>
                    run(async () => {
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
                    })
                  }
                  onVote={(optionIds) =>
                    run(async () => {
                      await api.castVote(token, session, optionIds);
                      await refreshDashboard(workspace);
                      setNotice('Vote accepted. Waiting for the result worker.');
                    })
                  }
                />
              ) : null}
              {canvasMode === 'settings' ? (
                <WorkspaceSettingsPanel
                  workspace={workspace}
                  onInvite={(email) =>
                    run(async () => {
                      await api.addMember(token, workspace.id, email);
                      await refreshWorkspaces(auth, workspace.id);
                      await refreshDashboard(workspace);
                      await refreshMembers(workspace);
                      setNotice('Member added.');
                    })
                  }
                />
              ) : null}
            </>
          ) : (
            <section className="empty-state empty-state-action">
              <EmptyState title="Create a workspace" text="Create the first workspace node to start capturing decisions, members, and live result snapshots." />
              <button className="primary-button" type="button" onClick={() => setCreateWorkspaceOpen(true)}>
                New workspace
              </button>
            </section>
          )}
        </div>
      </section>

      {createWorkspaceOpen ? (
        <div className="modal-overlay" role="presentation" onClick={() => setCreateWorkspaceOpen(false)}>
          <section className="session-modal session-modal-compact" role="dialog" aria-modal="true" aria-labelledby="create-workspace-title" onClick={(event) => event.stopPropagation()}>
            <div className="session-modal-header">
              <div>
                <p className="small-heading">Workspace</p>
                <h2 id="create-workspace-title">Create a new workspace</h2>
              </div>
              <button className="icon-button session-modal-close" type="button" aria-label="Close create workspace modal" onClick={() => setCreateWorkspaceOpen(false)}>
                x
              </button>
            </div>
            <form
              className="dashboard-session-form"
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  const created = await api.createWorkspace(token, {
                    name: newWorkspaceName,
                    slug: slugify(newWorkspaceName) || `workspace-${Date.now()}`,
                  });
                  setWorkspaces((items) => [...items, created]);
                  activeWorkspaceId.current = created.id;
                  activeSessionId.current = null;
                  setWorkspace(created);
                  setSessions([]);
                  setSession(null);
                  setResult(null);
                  setCanvasMode('board');
                  setSearchQuery('');
                  setNewWorkspaceName('');
                  setCreateWorkspaceOpen(false);
                  await refreshDashboard(created);
                  setNotice('Workspace created.');
                });
              }}
            >
              <label>
                Workspace name
                <input value={newWorkspaceName} onChange={(event) => setNewWorkspaceName(event.target.value)} placeholder="Architecture Council" required />
              </label>
              <div className="dashboard-session-actions">
                <button className="secondary-button" type="button" onClick={() => setCreateWorkspaceOpen(false)}>
                  Cancel
                </button>
                <button className="primary-button" type="submit">
                  Create
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
