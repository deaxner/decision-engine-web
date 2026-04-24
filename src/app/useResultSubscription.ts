import { useEffect, useEffectEvent, useState } from 'react';
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
  const handleResultUpdated = useEffectEvent(async (currentSession: DecisionSession, currentWorkspace: Workspace | null) => {
    await run(async () => {
      await refreshSession(currentSession);
      await refreshResult(currentSession);
      await refreshWorkspaces(auth, currentWorkspace?.id);
      await refreshDashboard(currentWorkspace);
    });
  });

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
      void handleResultUpdated(session, workspace);
    });

    return () => events.close();
  }, [session?.id, session?.status, token, workspace?.id]);

  return {
    result,
    setResult,
    loadingResult,
    refreshResult,
    clearResultState,
  };
}
