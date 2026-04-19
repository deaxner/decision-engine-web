import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import { AuthLanding } from './auth/AuthLanding';
import { slugify } from './lib/slugify';
import { SessionBoard } from './sessions/SessionBoard';
import { SessionDetail } from './sessions/SessionDetail';
import { EmptyState } from './shared/EmptyState';
import { StatusBar } from './shared/StatusBar';
import { clearAuth, loadAuth, saveAuth } from './storage';
import type { AuthState, DecisionSession, SessionResult, Workspace } from './types';
import { WorkspaceHeader } from './workspace/WorkspaceHeader';
import { WorkspacePanel } from './workspace/WorkspacePanel';
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

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(() => loadAuth());
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [sessions, setSessions] = useState<DecisionSession[]>([]);
  const [session, setSession] = useState<DecisionSession | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [sessionsByWorkspace, setSessionsByWorkspace] = useState<Record<string, DecisionSession[]>>({});
  const [resultsBySession, setResultsBySession] = useState<Record<string, SessionResult | null>>({});
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingResult, setLoadingResult] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const activeWorkspaceId = useRef<string | null>(null);
  const activeSessionId = useRef<string | null>(null);

  const token = auth?.token ?? '';
  const visibleWorkspaces = searchQuery.trim().length === 0
    ? workspaces
    : workspaces.filter((item) => `${item.name} ${item.slug}`.toLowerCase().includes(searchQuery.trim().toLowerCase()));
  const visibleSessions = searchQuery.trim().length === 0
    ? sessions
    : sessions.filter((item) =>
        `${item.title} ${item.description ?? ''} ${item.status} ${item.voting_type}`.toLowerCase().includes(searchQuery.trim().toLowerCase()),
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
    setWorkspaces([]);
    setWorkspace(null);
    setSessions([]);
    setSession(null);
    setResult(null);
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
    setSession(null);
    setResult(null);
  }

  if (!auth) {
    return (
      <main className="app-shell auth-shell">
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
          <div className="oracle-search">
            <input
              aria-label="Search insights"
              placeholder="Search insights..."
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
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
            workspaces={visibleWorkspaces}
            active={workspace}
            onSelect={(next) => selectWorkspaceById(next.id)}
            onCreate={(name) =>
              run(async () => {
                const created = await api.createWorkspace(token, { name, slug: slugify(name) || `workspace-${Date.now()}` });
                setWorkspaces((items) => [...items, created]);
                setWorkspace(created);
                setNotice('Workspace created.');
              })
            }
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
                {session ? (
                  <>
                    <span>/</span>
                    <span>{session.title}</span>
                  </>
                ) : null}
              </div>
              <WorkspaceHeader
                workspace={workspace}
                workspaces={workspaces}
                onSelectWorkspace={selectWorkspaceById}
                onInvite={(email) =>
                  run(async () => {
                    await api.addMember(token, workspace.id, email);
                    await refreshWorkspaces(auth, workspace.id);
                    setNotice('Member added.');
                  })
                }
              />
              <SessionBoard
                sessions={visibleSessions}
                totalSessions={sessions.length}
                searchQuery={searchQuery}
                workspace={workspace}
                active={session}
                loading={loadingSessions}
                onSelect={(next) => {
                  activeSessionId.current = next.id;
                  setSession(next);
                  setResult(resultsBySession[next.id] ?? null);
                }}
                onCreate={(payload) =>
                  run(async () => {
                    const created = await api.createSession(token, workspace.id, payload);
                    const nextSessions = [created, ...sessions];
                    setSessions(nextSessions);
                    setSessionsByWorkspace((cache) => ({ ...cache, [workspace.id]: nextSessions }));
                    updateWorkspaceSummary(workspace.id, nextSessions);
                    setSession(created);
                    setResult(null);
                    setNotice('Decision session created.');
                  })
                }
              />
              {session ? (
                <SessionDetail
                  session={session}
                  result={result}
                  loadingResult={loadingResult}
                  onAddOption={(title) =>
                    run(async () => {
                      await api.addOption(token, session.id, title);
                      await refreshSession(session);
                      await refreshSessions(workspace);
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
                      setNotice(status === 'OPEN' ? 'Voting opened.' : 'Session closed.');
                    })
                  }
                  onVote={(optionIds) =>
                    run(async () => {
                      await api.castVote(token, session, optionIds);
                      setNotice('Vote accepted. Waiting for the result worker.');
                    })
                  }
                  />
              ) : null}
            </>
          ) : (
            <EmptyState title="Create a workspace" text="Create the first workspace node to start capturing decisions, members, and live result snapshots." />
          )}
        </div>
      </section>
    </main>
  );
}
