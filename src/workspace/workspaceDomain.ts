import type { DecisionSession, Workspace } from '../types';

export function summarizeSessions(items: DecisionSession[]) {
  return items.reduce(
    (summary, item) => {
      summary.total += 1;
      if (item.status === 'DRAFT') {
        summary.draft += 1;
      } else if (item.status === 'OPEN') {
        summary.open += 1;
      } else {
        summary.closed += 1;
      }

      return summary;
    },
    { total: 0, draft: 0, open: 0, closed: 0 },
  );
}

export function selectPreferredWorkspace({
  workspaces,
  preferredWorkspaceId,
  activeWorkspaceId,
  currentWorkspaceId,
}: {
  workspaces: Workspace[];
  preferredWorkspaceId?: string | null;
  activeWorkspaceId?: string | null;
  currentWorkspaceId?: string | null;
}) {
  const nextWorkspaceId = preferredWorkspaceId ?? activeWorkspaceId ?? currentWorkspaceId ?? null;
  return workspaces.find((item) => item.id === nextWorkspaceId) ?? workspaces[0] ?? null;
}
