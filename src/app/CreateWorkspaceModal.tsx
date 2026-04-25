import { useRef } from 'react';
import { useDialogFocusTrap } from '../shared/useDialogFocusTrap';
import type { useResultSubscription } from './useResultSubscription';
import type { useSessionController } from './useSessionController';
import type { useWorkspaceController } from './useWorkspaceController';

export function CreateWorkspaceModal({
  workspaceController,
  sessionController,
  resultController,
  run,
}: {
  workspaceController: ReturnType<typeof useWorkspaceController>;
  sessionController: ReturnType<typeof useSessionController>;
  resultController: ReturnType<typeof useResultSubscription>;
  run: (action: () => Promise<void>) => Promise<boolean>;
}) {
  const dialogRef = useRef<HTMLElement | null>(null);
  useDialogFocusTrap({
    active: workspaceController.createWorkspaceOpen,
    dialogRef,
    onClose: () => workspaceController.setCreateWorkspaceOpen(false),
  });

  if (!workspaceController.createWorkspaceOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={() => workspaceController.setCreateWorkspaceOpen(false)}>
      <section className="session-modal session-modal-compact" role="dialog" aria-modal="true" aria-labelledby="create-workspace-title" ref={dialogRef} onClick={(event) => event.stopPropagation()}>
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
              <input
                value={workspaceController.newWorkspaceName}
                onChange={(event) => workspaceController.setNewWorkspaceName(event.target.value)}
                placeholder="Architecture Council"
                required
              />
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
  );
}
