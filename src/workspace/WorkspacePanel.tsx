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
  onCreateDecision: () => void;
}) {
  return (
    <section className="workspace-panel">
      {!collapsed ? (
        <>
          {active ? (
            <div className="workspace-node-card">
              <div className="workspace-node-icon">⌘</div>
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

          <nav className="workspace-rail-nav" aria-label="Workspace navigation">
            <a className="active" href="#dashboard">
              <span>▦</span>
              <span>Dashboard</span>
            </a>
            <a href="#team-nodes">
              <span>⌘</span>
              <span>Team Nodes</span>
            </a>
            <a href="#decision-log">
              <span>∕</span>
              <span>Decision Log</span>
            </a>
            <a href="#analytics">
              <span>⌁</span>
              <span>Analytics</span>
            </a>
            <a href="#archive">
              <span>▤</span>
              <span>Archive</span>
            </a>
          </nav>

          <button className="workspace-rail-create" type="button" onClick={onCreateDecision}>
            + New Decision
          </button>

          <a className="workspace-rail-help" href="#help">
            <span>?</span>
            <span>Help Center</span>
          </a>
        </>
      ) : null}
    </section>
  );
}
