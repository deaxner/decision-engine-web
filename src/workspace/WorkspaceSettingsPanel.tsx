import type { Workspace } from '../types';
import './workspace.css';

export function WorkspaceSettingsPanel({
  workspace,
  onInvite,
}: {
  workspace: Workspace;
  onInvite: (email: string) => void;
}) {
  return (
    <section className="workspace-settings-layout">
      <section className="workspace-settings-card">
        <div className="section-heading">
          <div>
            <p className="small-heading">Workspace settings</p>
            <h2>Members and access</h2>
          </div>
          <p className="muted">Keep collaboration controls in one secondary surface instead of the navigation rail.</p>
        </div>
        <div className="workspace-settings-grid">
          <article className="workspace-settings-stat">
            <span className="small-heading">Role</span>
            <strong>{workspace.role === 'OWNER' ? 'Owner' : 'Member'}</strong>
            <p>You currently have {workspace.role === 'OWNER' ? 'full control over this workspace.' : 'member access to this workspace.'}</p>
          </article>
          <article className="workspace-settings-stat">
            <span className="small-heading">Members</span>
            <strong>{workspace.member_count}</strong>
            <p>Total collaborators who can access this workspace.</p>
          </article>
          <article className="workspace-settings-stat">
            <span className="small-heading">Open sessions</span>
            <strong>{workspace.session_counts.open}</strong>
            <p>Decision sessions that are currently collecting votes.</p>
          </article>
        </div>
      </section>

      <aside className="workspace-settings-side">
        <section className="workspace-settings-card">
          <div className="section-heading">
            <div>
              <p className="small-heading">Invite member</p>
              <h2>Add collaborator</h2>
            </div>
          </div>
          <form
            className="workspace-settings-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              onInvite(String(form.get('email') ?? ''));
              event.currentTarget.reset();
            }}
          >
            <label>
              Member email
              <input
                name="email"
                type="email"
                placeholder="member@company.com"
                required
                disabled={workspace.role !== 'OWNER'}
              />
            </label>
            <button className="primary-button" type="submit" disabled={workspace.role !== 'OWNER'}>
              Add member
            </button>
          </form>
        </section>

        <section className="workspace-settings-card">
          <div className="section-heading">
            <div>
              <p className="small-heading">Workspace snapshot</p>
              <h2>Current status</h2>
            </div>
          </div>
          <div className="workspace-settings-grid workspace-settings-grid-compact">
            <article className="workspace-settings-stat">
              <span className="small-heading">Draft</span>
              <strong>{workspace.session_counts.draft}</strong>
            </article>
            <article className="workspace-settings-stat">
              <span className="small-heading">Closed</span>
              <strong>{workspace.session_counts.closed}</strong>
            </article>
          </div>
        </section>
      </aside>
    </section>
  );
}
