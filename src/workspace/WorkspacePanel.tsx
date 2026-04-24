import type { Workspace } from '../types';
import './workspace.css';

export function WorkspacePanel({
  collapsed,
  workspaces,
  active,
  onSelect,
  onCreateDecision,
}: {
  collapsed: boolean;
  workspaces: Workspace[];
  active: Workspace | null;
  onSelect: (workspace: Workspace) => void;
  onCreateDecision?: () => void;
}) {
  return (
    <section className="workspace-panel">
      {!collapsed ? (
        <>
          {active ? (
            <div className="workspace-node-card">
              <div className="workspace-node-icon">WS</div>
              <div>
                <h3>{active.name}</h3>
                <p>{active.role === 'OWNER' ? 'Enterprise Node' : 'Team Node'}</p>
              </div>
            </div>
          ) : null}

          {workspaces.length > 1 ? (
            <label className="workspace-switcher workspace-switcher-rail">
              Workspace
              <select
                value={active?.id ?? ''}
                onChange={(event) => onSelect(workspaces.find((item) => item.id === event.target.value) ?? workspaces[0])}
                aria-label="Workspace selector"
              >
                {workspaces.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <section className="workspace-rail-nav" aria-label="Workspace surfaces">
            <div className="workspace-rail-item workspace-rail-item-active">
              <span>DB</span>
              <span>Dashboard</span>
            </div>
            <div className="workspace-rail-item">
              <span>ST</span>
              <span>Workspace settings</span>
            </div>
            <div className="workspace-rail-item">
              <span>LG</span>
              <span>Decision log</span>
            </div>
          </section>

          {onCreateDecision ? (
            <button className="workspace-rail-create" type="button" onClick={onCreateDecision}>
              + New Decision
            </button>
          ) : null}

          <p className="workspace-rail-help">
            Workspace actions live in the header and board.
          </p>
        </>
      ) : null}
    </section>
  );
}
