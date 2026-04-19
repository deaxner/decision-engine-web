import { useState } from 'react';
import type { Workspace } from '../types';
import './workspace.css';

export function WorkspaceHeader({
  workspace,
  workspaces,
  onSelectWorkspace,
  onInvite,
}: {
  workspace: Workspace;
  workspaces: Workspace[];
  onSelectWorkspace: (workspaceId: string) => void;
  onInvite: (email: string) => void;
}) {
  const [email, setEmail] = useState('');

  return (
    <section className="workspace-header">
      <div className="workspace-header-copy">
        <p className="eyebrow">{workspace.slug}</p>
        <h2>{workspace.name}</h2>
        <p className="muted">Invite collaborators and keep this workspace as the accountable record for its decisions.</p>
        <p className="workspace-header-meta">
          {workspace.member_count} members · {workspace.session_counts.open} open · {workspace.session_counts.closed} closed
        </p>
      </div>
      <div className="workspace-header-actions">
        {workspaces.length > 1 ? (
          <label className="workspace-switcher">
            Workspace
            <select value={workspace.id} onChange={(event) => onSelectWorkspace(event.target.value)} aria-label="Workspace selector">
              {workspaces.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <form
          className="invite-form"
          onSubmit={(event) => {
            event.preventDefault();
            onInvite(email);
            setEmail('');
          }}
        >
          <label>
            Member email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="member@company.com"
              required
              disabled={workspace.role !== 'OWNER'}
            />
          </label>
          <button className="secondary-button" type="submit" disabled={workspace.role !== 'OWNER'}>
            Add member
          </button>
        </form>
      </div>
    </section>
  );
}
