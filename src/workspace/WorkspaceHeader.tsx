import type { Workspace } from "../types";
import "./workspace.css";

export function WorkspaceHeader({
  workspace,
  mode,
  onCreateDecision,
  onOpenSettings,
  onOpenCreateWorkspace,
  onBackToBoard,
}: {
  workspace: Workspace;
  mode: "board" | "detail" | "settings";
  onCreateDecision: () => void;
  onOpenSettings: () => void;
  onOpenCreateWorkspace: () => void;
  onBackToBoard: () => void;
}) {
  return (
    <section className="workspace-header">
      <div className="workspace-header-copy">
        <p className="eyebrow">{workspace.slug}</p>
        <h2>{workspace.name}</h2>

        <p className="muted">
          {mode === "board"
            ? "Scan live decisions, review workspace health, and open one focused detail view at a time."
            : mode === "settings"
              ? "Manage collaborators and workspace-level context in a secondary surface."
              : "Focus on one decision at a time without the board competing for attention."}
        </p>
        <p className="workspace-header-meta">{`${workspace.member_count} members | ${workspace.session_counts.open} active sessions | ${workspace.session_counts.closed} archived`}</p>
      </div>
      <div className="workspace-header-actions">
        {mode === "detail" ? (
          <button
            className="secondary-button workspace-header-button"
            type="button"
            onClick={onBackToBoard}
          >
            Back to board
          </button>
        ) : null}
        {mode !== "settings" ? (
          <button
            className="ghost-button workspace-header-button workspace-header-button-ghost"
            type="button"
            onClick={onOpenSettings}
          >
            Workspace settings
          </button>
        ) : (
          <button
            className="ghost-button workspace-header-button workspace-header-button-ghost"
            type="button"
            onClick={onBackToBoard}
          >
            Back to board
          </button>
        )}
        <button
          className="secondary-button workspace-header-button"
          type="button"
          onClick={onOpenCreateWorkspace}
        >
          New workspace
        </button>
        {mode !== "settings" ? (
          <button
            className="primary-button workspace-header-button"
            type="button"
            onClick={onCreateDecision}
          >
            Create decision
          </button>
        ) : null}
      </div>
    </section>
  );
}
