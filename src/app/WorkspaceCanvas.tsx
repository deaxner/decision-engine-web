import { SessionBoard } from '../sessions/SessionBoard';
import { SessionDetail } from '../sessions/SessionDetail';
import { EmptyState } from '../shared/EmptyState';
import { StatusBar } from '../shared/StatusBar';
import { WorkspaceHeader } from '../workspace/WorkspaceHeader';
import { WorkspaceSettingsPanel } from '../workspace/WorkspaceSettingsPanel';
import type { useResultSubscription } from './useResultSubscription';
import type { useSessionController } from './useSessionController';
import type { useWorkspaceController } from './useWorkspaceController';

export function WorkspaceCanvas({
  notice,
  error,
  workspaceController,
  sessionController,
  resultController,
  run,
}: {
  notice: string;
  error: string;
  workspaceController: ReturnType<typeof useWorkspaceController>;
  sessionController: ReturnType<typeof useSessionController>;
  resultController: ReturnType<typeof useResultSubscription>;
  run: (action: () => Promise<void>) => Promise<boolean>;
}) {
  const canCreateDecision = workspaceController.workspace?.role === 'OWNER';

  return (
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
              onCreateDecision={canCreateDecision ? () => sessionController.setCreateDecisionOpen(true) : undefined}
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
                canCreateDecision={canCreateDecision}
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
  );
}
