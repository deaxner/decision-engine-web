import type { Workspace } from '../types';
import './workspace.css';

export function WorkspaceHeader({
  workspace,
  onCreateDecision,
}: {
  workspace: Workspace;
  onCreateDecision: () => void;
}) {
  return (
    <section className="workspace-header">
      <div className="workspace-header-copy">
        <p className="eyebrow">{workspace.slug}</p>
        <h2>{workspace.name}</h2>
        <p className="muted">Invite collaborators and keep this workspace as the accountable record for its decisions.</p>
        <p className="workspace-header-meta">
          {`${workspace.member_count} members | ${workspace.session_counts.open} open | ${workspace.session_counts.closed} closed`}
        </p>
      </div>
      <div className="workspace-header-actions">
        <button className="primary-button workspace-header-button" type="button" onClick={onCreateDecision}>
          Create decision
        </button>
      </div>
    </section>
  );
}
