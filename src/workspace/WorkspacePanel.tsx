import { useState } from 'react';
import type { Workspace } from '../types';

export function WorkspacePanel({
  workspaces,
  active,
  onSelect,
  onCreate,
}: {
  workspaces: Workspace[];
  active: Workspace | null;
  onSelect: (workspace: Workspace) => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState('');

  return (
    <section>
      <h2>Workspaces</h2>
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
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <button className="primary-button" type="submit">
          Add
        </button>
      </form>
      <div className="list-stack">
        {workspaces.map((item) => (
          <button key={item.id} className={active?.id === item.id ? 'list-row active' : 'list-row'} onClick={() => onSelect(item)}>
            <span>{item.name}</span>
            <small>{item.role}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
