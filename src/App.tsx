import { useEffect, useState } from 'react';
import { AppTopbar } from './app/AppTopbar';
import { CreateWorkspaceModal } from './app/CreateWorkspaceModal';
import { useResultSubscription } from './app/useResultSubscription';
import { useSessionController } from './app/useSessionController';
import { useToastController } from './app/useToastController';
import { useWorkspaceController } from './app/useWorkspaceController';
import { WorkspaceCanvas } from './app/WorkspaceCanvas';
import { WorkspaceRail } from './app/WorkspaceRail';
import { AuthLanding } from './auth/AuthLanding';
import { clearAuth, loadAuth, saveAuth } from './storage';
import type { AuthState } from './types';
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
      <AppTopbar
        auth={auth}
        railCollapsed={railCollapsed}
        searchRef={sessionController.searchRef}
        searchQuery={sessionController.searchQuery}
        normalizedSearchQuery={sessionController.normalizedSearchQuery}
        searchResults={sessionController.searchResults}
        onToggleRail={() => setRailCollapsed((current) => !current)}
        onSearchChange={sessionController.setSearchQuery}
        onSelectSession={sessionController.selectSession}
        onSignOut={signOut}
      />
      <WorkspaceRail
        railCollapsed={railCollapsed}
        workspaces={workspaceController.workspaces}
        active={workspaceController.workspace}
        openSessions={openSessions}
        onSelectWorkspace={selectWorkspaceById}
        onCreateDecision={() => sessionController.setCreateDecisionOpen(true)}
      />
      <WorkspaceCanvas
        notice={notice}
        error={error}
        workspaceController={workspaceController}
        sessionController={sessionController}
        resultController={resultController}
        run={run}
      />
      <CreateWorkspaceModal
        workspaceController={workspaceController}
        sessionController={sessionController}
        resultController={resultController}
        run={run}
      />
    </main>
  );
}
