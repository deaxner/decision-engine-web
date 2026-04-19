import { useEffect, useState } from 'react';
import { useResultSubscription } from './app/useResultSubscription';
import { useSessionController } from './app/useSessionController';
import { useToastController } from './app/useToastController';
import { useWorkspaceController } from './app/useWorkspaceController';
import { AuthLanding } from './auth/AuthLanding';
import { SessionBoard } from './sessions/SessionBoard';
import { SessionDetail } from './sessions/SessionDetail';
import { EmptyState } from './shared/EmptyState';
import { StatusBar } from './shared/StatusBar';
import { clearAuth, loadAuth, saveAuth } from './storage';
import type { AuthState } from './types';
import { WorkspaceHeader } from './workspace/WorkspaceHeader';
import { WorkspacePanel } from './workspace/WorkspacePanel';
import { WorkspaceSettingsPanel } from './workspace/WorkspaceSettingsPanel';
import './styles/base.css';
import './styles/app-shell.css';

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(() => loadAuth());
  const [railCollapsed, setRailCollapsed] = useState(false);
  const { notice, error, setNotice, setError, run } = useToastController();
  const token = auth?.token ?? '';

  const workspaceController = useWorkspaceController({
    auth,
    token,
    run,
    setNotice,
  });

  const sessionController = useSessionController({
    auth,
    token,
    workspace: workspaceController.workspace,
    activeWorkspaceId: workspaceController.activeWorkspaceId,
    run,
    setNotice,
    updateWorkspaceSummary: workspaceController.updateWorkspaceSummary,
    refreshWorkspaces: workspaceController.refreshWorkspaces,
    refreshDashboard: workspaceController.refreshDashboard,
    refreshMembers: workspaceController.refreshMembers,
  });

  const resultController = useResultSubscription({
    auth,
    token,
    workspace: workspaceController.workspace,
    session: sessionController.session,
    activeSessionId: sessionController.activeSessionId,
    run,
    refreshSession: sessionController.refreshSession,
    refreshWorkspaces: workspaceController.refreshWorkspaces,
    refreshDashboard: workspaceController.refreshDashboard,
  });

  const openSessions =
    workspaceController.workspace?.session_counts.open ??
    sessionController.sessions.filter((item) => item.status === 'OPEN').length;

  useEffect(() => {
    if (auth) {
      void run(() => workspaceController.refreshWorkspaces(auth));
    }
  }, []);

  useEffect(() => {
    workspaceController.activeWorkspaceId.current = workspaceController.workspace?.id ?? null;
    void run(sessionController.refreshSessions);
    void workspaceController.refreshDashboard();
    void workspaceController.refreshMembers();
  }, [workspaceController.workspace?.id]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!sessionController.searchRef.current?.contains(event.target as Node)) {
        sessionController.setSearchQuery('');
      }
    }

    if (!sessionController.normalizedSearchQuery) {
      return;
    }

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [sessionController.normalizedSearchQuery]);

  function acceptAuth(nextAuth: AuthState) {
    saveAuth(nextAuth);
    setAuth(nextAuth);
    setNotice(`Signed in as ${nextAuth.user.display_name}`);
    void run(() => workspaceController.refreshWorkspaces(nextAuth));
  }

  function signOut() {
    clearAuth();
    setAuth(null);
    workspaceController.clearWorkspaceState();
    sessionController.clearSessionState();
    resultController.clearResultState();
  }

  function selectWorkspaceById(workspaceId: string) {
    const next = workspaceController.selectWorkspaceById(workspaceId);
    if (!next) {
      return;
    }
    sessionController.selectWorkspaceSessions(next);
    resultController.clearResultState();
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
          <div className="oracle-search" ref={sessionController.searchRef}>
            <input
              aria-label="Search votes"
              placeholder="Search votes..."
              type="text"
              value={sessionController.searchQuery}
              onChange={(event) => sessionController.setSearchQuery(event.target.value)}
            />
            {sessionController.normalizedSearchQuery ? (
              <ul className="search-results" aria-label="Vote search results">
                {sessionController.searchResults.length > 0 ? (
                  sessionController.searchResults.map((item) => (
                    <li key={item.id}>
                      <button className="search-result-button" type="button" onClick={() => sessionController.selectSession(item)}>
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
          <span>{workspaceController.workspaces.length} total</span>
          <span>{openSessions} open sessions</span>
        </div>
        <div className="rail-panel">
          <WorkspacePanel
            collapsed={railCollapsed}
            workspaces={workspaceController.workspaces}
            active={workspaceController.workspace}
            onSelect={(next) => selectWorkspaceById(next.id)}
            onCreateDecision={() => sessionController.setCreateDecisionOpen(true)}
          />
        </div>
      </aside>

      <section className="app-canvas">
        <div className="canvas-shell">
          <StatusBar notice={notice} error={error} />
          {workspaceController.workspace ? (
            <>
              <div className="breadcrumb-trail" aria-label="Breadcrumb">
                <span>Workspaces</span>
                <span>/</span>
                <span>{workspaceController.workspace.name}</span>
                {sessionController.canvasMode === 'settings' ? (
                  <>
                    <span>/</span>
                    <span>Settings</span>
                  </>
                ) : null}
                {sessionController.canvasMode === 'detail' && sessionController.session ? (
                  <>
                    <span>/</span>
                    <span>{sessionController.session.title}</span>
                  </>
                ) : null}
              </div>
              <WorkspaceHeader
                workspace={workspaceController.workspace}
                mode={sessionController.canvasMode}
                onCreateDecision={() => sessionController.setCreateDecisionOpen(true)}
                onOpenSettings={() => sessionController.setCanvasMode('settings')}
                onOpenCreateWorkspace={() => workspaceController.setCreateWorkspaceOpen(true)}
                onBackToBoard={() => sessionController.setCanvasMode('board')}
              />
              {sessionController.canvasMode === 'board' ? (
                <SessionBoard
                  workspace={workspaceController.workspace}
                  sessions={sessionController.sessions}
                  active={sessionController.session}
                  loading={sessionController.loadingSessions}
                  dashboard={workspaceController.dashboard}
                  loadingDashboard={workspaceController.loadingDashboard}
                  dashboardError={workspaceController.dashboardError}
                  members={workspaceController.workspaceMembers}
                  loadingMembers={workspaceController.loadingMembers}
                  createOpen={sessionController.createDecisionOpen}
                  onCreateOpenChange={sessionController.setCreateDecisionOpen}
                  onSelect={sessionController.selectSession}
                  onSelectActivitySession={sessionController.selectSessionById}
                  onRetryDashboard={() => void workspaceController.refreshDashboard(workspaceController.workspace)}
                  onCreate={(payload) => run(() => sessionController.createSession(payload))}
                />
              ) : null}
              {sessionController.canvasMode === 'detail' && sessionController.session ? (
                <SessionDetail
                  session={sessionController.session}
                  result={resultController.result}
                  loadingResult={resultController.loadingResult}
                  onAddOption={(title) => run(() => sessionController.addOption(title))}
                  onStatus={(status) => run(() => sessionController.updateSessionStatus(status))}
                  onVote={(optionIds) => run(() => sessionController.castVote(optionIds))}
                />
              ) : null}
              {sessionController.canvasMode === 'settings' ? (
                <WorkspaceSettingsPanel
                  workspace={workspaceController.workspace}
                  onInvite={(email) => run(() => workspaceController.addMember(email))}
                />
              ) : null}
            </>
          ) : (
            <section className="empty-state empty-state-action">
              <EmptyState title="Create a workspace" text="Create the first workspace node to start capturing decisions, members, and live result snapshots." />
              <button className="primary-button" type="button" onClick={() => workspaceController.setCreateWorkspaceOpen(true)}>
                New workspace
              </button>
            </section>
          )}
        </div>
      </section>

      {workspaceController.createWorkspaceOpen ? (
        <div className="modal-overlay" role="presentation" onClick={() => workspaceController.setCreateWorkspaceOpen(false)}>
          <section className="session-modal session-modal-compact" role="dialog" aria-modal="true" aria-labelledby="create-workspace-title" onClick={(event) => event.stopPropagation()}>
            <div className="session-modal-header">
              <div>
                <p className="small-heading">Workspace</p>
                <h2 id="create-workspace-title">Create a new workspace</h2>
              </div>
              <button className="icon-button session-modal-close" type="button" aria-label="Close create workspace modal" onClick={() => workspaceController.setCreateWorkspaceOpen(false)}>
                x
              </button>
            </div>
            <form
              className="dashboard-session-form"
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  await workspaceController.createWorkspace(workspaceController.newWorkspaceName);
                  sessionController.clearSessionState();
                  resultController.clearResultState();
                });
              }}
            >
              <label>
                Workspace name
                <input value={workspaceController.newWorkspaceName} onChange={(event) => workspaceController.setNewWorkspaceName(event.target.value)} placeholder="Architecture Council" required />
              </label>
              <div className="dashboard-session-actions">
                <button className="secondary-button" type="button" onClick={() => workspaceController.setCreateWorkspaceOpen(false)}>
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
