import { useState } from 'react';
import type { Workspace } from '../types';
import './workspace.css';

export function WorkspacePanel({
  collapsed,
  workspaces,
  active,
  onSelect,
  onCreate,
}: {
  collapsed: boolean;
  workspaces: Workspace[];
  active: Workspace | null;
  onSelect: (workspace: Workspace) => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState('');

  return (
    <section className="workspace-panel">
      {!collapsed ? (
        <form
          className="compact-form"
          onSubmit={(event) => {
            event.preventDefault();
            onCreate(name);
            setName('');
          }}
        >
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Architecture Council" required />
          </label>
          <button className="primary-button" type="submit">
            Create workspace
          </button>
        </form>
      ) : null}
      <div className="list-stack">
        {workspaces.map((item) => (
          <button
            key={item.id}
            className={active?.id === item.id ? 'list-row active' : 'list-row'}
            onClick={() => onSelect(item)}
            title={item.name}
          >
            <span className="list-row-copy">
              <strong>{collapsed ? item.name.slice(0, 2).toUpperCase() : item.name}</strong>
              {!collapsed ? <small>{item.role === 'OWNER' ? 'Owner access' : 'Member access'}</small> : null}
            </span>
            {!collapsed ? <small>{item.slug}</small> : null}
          </button>
        ))}
      </div>
    </section>
  );
}
