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
import './styles.css';

const MERCURE_URL = import.meta.env.VITE_MERCURE_URL ?? 'http://127.0.0.1:3001/.well-known/mercure';

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(() => loadAuth());
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

  async function run(action: () => Promise<void>) {
    setError('');
    try {
      await action();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Something went wrong.');
    }
  }

  async function refreshWorkspaces(nextAuth = auth) {
    if (!nextAuth) {
      return;
    }
    const items = await api.listWorkspaces(nextAuth.token);
    setWorkspaces(items);
    if (!workspace && items.length > 0) {
      setWorkspace(items[0]);
    }
  }

  async function refreshSessions(currentWorkspace = workspace) {
    if (!currentWorkspace || !token) {
      return;
    }
    setLoadingSessions(true);
    try {
      const items = await api.listSessions(token, currentWorkspace.id);
      setSessionsByWorkspace((cache) => ({ ...cache, [currentWorkspace.id]: items }));
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

  if (!auth) {
    return (
      <main className="app-shell auth-shell">
        <AuthLanding notice={notice} error={error} onAuth={acceptAuth} onError={setError} />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Decision Engine</p>
          <h1>Workspace decisions</h1>
        </div>
        <div className="user-strip">
          <span>{auth.user.display_name}</span>
          <button className="ghost-button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <StatusBar notice={notice} error={error} />

      <section className="workspace-layout">
        <aside className="sidebar">
          <WorkspacePanel
            workspaces={workspaces}
            active={workspace}
            onSelect={(next) => {
              activeWorkspaceId.current = next.id;
              activeSessionId.current = null;
              setWorkspace(next);
              setSessions(sessionsByWorkspace[next.id] ?? []);
              setSession(null);
              setResult(null);
            }}
            onCreate={(name) =>
              run(async () => {
                const created = await api.createWorkspace(token, { name, slug: slugify(name) || `workspace-${Date.now()}` });
                setWorkspaces((items) => [...items, created]);
                setWorkspace(created);
                setNotice('Workspace created.');
              })
            }
          />
        </aside>

        <section className="content-column">
          {workspace ? (
            <>
              <WorkspaceHeader
                workspace={workspace}
                onInvite={(email) =>
                  run(async () => {
                    await api.addMember(token, workspace.id, email);
                    setNotice('Member added.');
                  })
                }
              />
              <SessionBoard
                sessions={sessions}
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
                      setSessions((items) => items.map((item) => (item.id === updated.id ? updated : item)));
                      await refreshSessions(workspace);
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
              ) : (
                <EmptyState title="Select or create a session" text="Draft decisions, open them for voting, then watch result snapshots update." />
              )}
            </>
          ) : (
            <EmptyState title="Create a workspace" text="Workspaces isolate members, decisions, votes, and result streams." />
          )}
        </section>
      </section>
    </main>
  );
}
