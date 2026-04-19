import { useEffect, useState } from 'react';
import type { MutableRefObject } from 'react';
import { api } from '../api';
import type { AuthState, DecisionSession, SessionResult, Workspace } from '../types';

const MERCURE_URL = import.meta.env.VITE_MERCURE_URL ?? 'http://127.0.0.1:3001/.well-known/mercure';

export function useResultSubscription({
  auth,
  token,
  workspace,
  session,
  activeSessionId,
  run,
  refreshSession,
  refreshWorkspaces,
  refreshDashboard,
}: {
  auth: AuthState | null;
  token: string;
  workspace: Workspace | null;
  session: DecisionSession | null;
  activeSessionId: MutableRefObject<string | null>;
  run: (action: () => Promise<void>) => Promise<void>;
  refreshSession: (currentSession?: DecisionSession | null) => Promise<void>;
  refreshWorkspaces: (nextAuth?: AuthState | null, preferredWorkspaceId?: string | null) => Promise<void>;
  refreshDashboard: (currentWorkspace?: Workspace | null) => Promise<void>;
}) {
  const [result, setResult] = useState<SessionResult | null>(null);
  const [resultsBySession, setResultsBySession] = useState<Record<string, SessionResult | null>>({});
  const [loadingResult, setLoadingResult] = useState(false);

  async function refreshResult(currentSession = session) {
    if (!currentSession || !token || currentSession.status === 'DRAFT') {
      setResult(null);
      return;
    }
    setLoadingResult(true);
    try {
      const latest = await api.getResult(token, currentSession.id);
      setResultsBySession((cache) => ({ ...cache, [currentSession.id]: latest }));
      if (activeSessionId.current === currentSession.id) {
        setResult(latest);
      }
    } finally {
      setLoadingResult(false);
    }
  }

  function clearResultState() {
    setResult(null);
    setResultsBySession({});
    setLoadingResult(false);
  }

  useEffect(() => {
    activeSessionId.current = session?.id ?? null;
    if (session?.id) {
      setResult(resultsBySession[session.id] ?? null);
    } else {
      setResult(null);
    }
    void run(refreshResult);
  }, [session?.id, session?.status]);

  useEffect(() => {
    if (!session || session.status === 'DRAFT' || !token) {
      return;
    }

    const url = `${MERCURE_URL}?topic=${encodeURIComponent(`/sessions/${session.id}/results`)}`;
    const events = new EventSource(url);
    events.addEventListener('result_updated', () => {
      void run(async () => {
        await refreshSession(session);
        await refreshResult(session);
        await refreshWorkspaces(auth, workspace?.id);
        await refreshDashboard(workspace);
      });
    });

    return () => events.close();
  }, [session?.id, session?.status, token]);

  return {
    result,
    setResult,
    loadingResult,
    refreshResult,
    clearResultState,
  };
}
