import { useRef, useState } from 'react';
import { api } from '../api';
import { slugify } from '../lib/slugify';
import type { AuthState, DecisionSession, Workspace, WorkspaceDashboard, WorkspaceMember } from '../types';

function summarizeSessions(items: DecisionSession[]) {
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

export function useWorkspaceController({
  auth,
  token,
  run,
  setNotice,
}: {
  auth: AuthState | null;
  token: string;
  run: (action: () => Promise<void>) => Promise<void>;
  setNotice: (notice: string) => void;
}) {
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [dashboard, setDashboard] = useState<WorkspaceDashboard | null>(null);
  const [membersByWorkspace, setMembersByWorkspace] = useState<Record<string, WorkspaceMember[]>>({});
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const activeWorkspaceId = useRef<string | null>(null);

  function updateWorkspaceSummary(workspaceId: string, items: DecisionSession[]) {
    const sessionCounts = summarizeSessions(items);
    setWorkspaces((current) =>
      current.map((item) => (item.id === workspaceId ? { ...item, session_counts: sessionCounts } : item)),
    );
    setWorkspace((current) => (current && current.id === workspaceId ? { ...current, session_counts: sessionCounts } : current));
  }

  async function refreshWorkspaces(nextAuth = auth, preferredWorkspaceId?: string | null) {
    if (!nextAuth) {
      return;
    }
    const items = await api.listWorkspaces(nextAuth.token);
    setWorkspaces(items);
    const nextWorkspaceId = preferredWorkspaceId ?? activeWorkspaceId.current ?? workspace?.id ?? null;
    const nextWorkspace = items.find((item) => item.id === nextWorkspaceId) ?? items[0] ?? null;
    setWorkspace(nextWorkspace);
  }

  async function refreshDashboard(currentWorkspace = workspace) {
    if (!currentWorkspace || !token) {
      return;
    }
    setLoadingDashboard(true);
    setDashboardError('');
    try {
      const latest = await api.getWorkspaceDashboard(token, currentWorkspace.id);
      if (activeWorkspaceId.current === currentWorkspace.id) {
        setDashboard(latest);
        setWorkspace(latest.workspace);
        setWorkspaces((items) => items.map((item) => (item.id === latest.workspace.id ? latest.workspace : item)));
      }
    } catch (exception) {
      setDashboardError(exception instanceof Error ? exception.message : 'Could not load dashboard.');
    } finally {
      setLoadingDashboard(false);
    }
  }

  async function refreshMembers(currentWorkspace = workspace) {
    if (!currentWorkspace || !token) {
      return;
    }
    setLoadingMembers(true);
    try {
      const members = await api.listMembers(token, currentWorkspace.id);
      setMembersByWorkspace((cache) => ({ ...cache, [currentWorkspace.id]: members }));
      if (activeWorkspaceId.current === currentWorkspace.id) {
        setWorkspaceMembers(members);
      }
    } catch {
      if (activeWorkspaceId.current === currentWorkspace.id) {
        setWorkspaceMembers([]);
      }
    } finally {
      setLoadingMembers(false);
    }
  }

  function selectWorkspaceById(workspaceId: string): Workspace | null {
    const next = workspaces.find((item) => item.id === workspaceId);
    if (!next) {
      return null;
    }
    activeWorkspaceId.current = next.id;
    setWorkspace(next);
    setWorkspaceMembers(membersByWorkspace[next.id] ?? []);
    setDashboard(null);
    setDashboardError('');
    setCreateWorkspaceOpen(false);

    return next;
  }

  async function createWorkspace(name: string) {
    const trimmedName = name.trim();
    const created = await api.createWorkspace(token, {
      name: trimmedName,
      slug: slugify(trimmedName) || `workspace-${Date.now()}`,
    });
    setWorkspaces((items) => [...items, created]);
    activeWorkspaceId.current = created.id;
    setWorkspace(created);
    setWorkspaceMembers([]);
    setDashboard(null);
    setDashboardError('');
    setNewWorkspaceName('');
    setCreateWorkspaceOpen(false);
    await refreshDashboard(created);
    setNotice('Workspace created.');

    return created;
  }

  async function addMember(email: string) {
    if (!workspace) {
      return;
    }

    await api.addMember(token, workspace.id, email.trim());
    await refreshWorkspaces(auth, workspace.id);
    await refreshDashboard(workspace);
    await refreshMembers(workspace);
    setNotice('Member added.');
  }

  function clearWorkspaceState() {
    activeWorkspaceId.current = null;
    setWorkspaces([]);
    setWorkspace(null);
    setDashboard(null);
    setWorkspaceMembers([]);
    setMembersByWorkspace({});
    setDashboardError('');
    setCreateWorkspaceOpen(false);
    setNewWorkspaceName('');
  }

  return {
    activeWorkspaceId,
    createWorkspaceOpen,
    setCreateWorkspaceOpen,
    newWorkspaceName,
    setNewWorkspaceName,
    workspaces,
    workspace,
    setWorkspace,
    dashboard,
    workspaceMembers,
    loadingMembers,
    loadingDashboard,
    dashboardError,
    updateWorkspaceSummary,
    refreshWorkspaces,
    refreshDashboard,
    refreshMembers,
    selectWorkspaceById,
    createWorkspace,
    addMember,
    clearWorkspaceState,
  };
}
