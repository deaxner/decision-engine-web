import type { Workspace } from '../types';
import { WorkspacePanel } from '../workspace/WorkspacePanel';

export function WorkspaceRail({
  railCollapsed,
  workspaces,
  active,
  openSessions,
  canCreateDecision,
  onSelectWorkspace,
  onCreateDecision,
}: {
  railCollapsed: boolean;
  workspaces: Workspace[];
  active: Workspace | null;
  openSessions: number;
  canCreateDecision: boolean;
  onSelectWorkspace: (workspaceId: string) => void;
  onCreateDecision: () => void;
}) {
  return (
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
          active={active}
          onSelect={(next) => onSelectWorkspace(next.id)}
          onCreateDecision={canCreateDecision ? onCreateDecision : undefined}
        />
      </div>
    </aside>
  );
}
