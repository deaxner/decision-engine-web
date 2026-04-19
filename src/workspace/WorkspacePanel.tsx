import { useState } from 'react';
import type { Workspace } from '../types';
import './workspace.css';

export function WorkspacePanel({
  collapsed,
  workspaces,
  active,
  onSelect,
  onCreate,
  onInvite,
  onOpenSettings,
}: {
  collapsed: boolean;
  workspaces: Workspace[];
  active: Workspace | null;
  onSelect: (workspace: Workspace) => void;
  onCreate: (name: string) => void;
  onInvite: (email: string) => void;
  onOpenSettings: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [addingMember, setAddingMember] = useState(false);

  return (
    <section className="workspace-panel">
      {!collapsed ? (
        <>
          {workspaces.length > 1 ? (
            <label className="workspace-switcher workspace-switcher-rail">
              Workspace
              <select value={active?.id ?? ''} onChange={(event) => onSelect(workspaces.find((item) => item.id === event.target.value) ?? workspaces[0])} aria-label="Workspace selector">
                {workspaces.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </>
      ) : null}
      {!collapsed ? (
        <div className="rail-bottom-actions">
          {creatingWorkspace ? (
            <form
              className="compact-form compact-form-rail"
              onSubmit={(event) => {
                event.preventDefault();
                onCreate(name);
                setName('');
                setCreatingWorkspace(false);
              }}
            >
              <p className="rail-section-title">Workspace</p>
              <label>
                Workspace name
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Architecture Council" required />
              </label>
              <div className="rail-inline-actions">
                <button className="secondary-button" type="button" onClick={() => setCreatingWorkspace(false)}>
                  Cancel
                </button>
                <button className="primary-button" type="submit">
                  Create
                </button>
              </div>
            </form>
          ) : (
            <button className="primary-button rail-action-button" type="button" onClick={() => setCreatingWorkspace(true)}>
              New workspace
            </button>
          )}
          {active ? (
            addingMember ? (
              <form
                className="invite-form invite-form-rail"
                onSubmit={(event) => {
                  event.preventDefault();
                  onInvite(email);
                  setEmail('');
                  setAddingMember(false);
                }}
              >
                <p className="rail-section-title">Members</p>
                <label>
                  Member email
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    placeholder="member@company.com"
                    required
                    disabled={active.role !== 'OWNER'}
                  />
                </label>
                <div className="rail-inline-actions">
                  <button className="secondary-button" type="button" onClick={() => setAddingMember(false)}>
                    Cancel
                  </button>
                  <button className="secondary-button" type="submit" disabled={active.role !== 'OWNER'}>
                    Add member
                  </button>
                </div>
              </form>
            ) : (
              <button className="secondary-button rail-action-button rail-action-button-secondary" type="button" onClick={() => setAddingMember(true)}>
                New member
              </button>
            )
          ) : null}
          {active ? (
            <button className="ghost-button rail-action-button rail-action-button-ghost" type="button" onClick={onOpenSettings}>
              Workspace settings
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
