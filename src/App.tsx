import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import { clearAuth, loadAuth, saveAuth } from './storage';
import type { AuthState, DecisionOption, DecisionSession, SessionResult, VotingType, Workspace } from './types';
import './styles.css';

const MERCURE_URL = import.meta.env.VITE_MERCURE_URL ?? 'http://127.0.0.1:3001/.well-known/mercure';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(() => loadAuth());
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [sessions, setSessions] = useState<DecisionSession[]>([]);
  const [session, setSession] = useState<DecisionSession | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [sessionsByWorkspace, setSessionsByWorkspace] = useState<Record<string, DecisionSession[]>>({});
  const [resultsBySession, setResultsBySession] = useState<Record<string, SessionResult | null>>({});
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingResult, setLoadingResult] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const activeWorkspaceId = useRef<string | null>(null);
  const activeSessionId = useRef<string | null>(null);

  const token = auth?.token ?? '';

  async function run(action: () => Promise<void>) {
    setError('');
    try {
      await action();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Something went wrong.');
    }
  }

  async function refreshWorkspaces(nextAuth = auth) {
    if (!nextAuth) {
      return;
    }
    const items = await api.listWorkspaces(nextAuth.token);
    setWorkspaces(items);
    if (!workspace && items.length > 0) {
      setWorkspace(items[0]);
    }
  }

  async function refreshSessions(currentWorkspace = workspace) {
    if (!currentWorkspace || !token) {
      return;
    }
    setLoadingSessions(true);
    try {
      const items = await api.listSessions(token, currentWorkspace.id);
      setSessionsByWorkspace((cache) => ({ ...cache, [currentWorkspace.id]: items }));
      if (activeWorkspaceId.current === currentWorkspace.id) {
        setSessions(items);
        setSession((current) => (current ? items.find((item) => item.id === current.id) ?? current : current));
      }
    } finally {
      setLoadingSessions(false);
    }
  }

  async function refreshSession(currentSession = session) {
    if (!currentSession || !token) {
      return;
    }
    const latest = await api.getSession(token, currentSession.id);
    setSession(latest);
  }

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

  useEffect(() => {
    if (auth) {
      void run(() => refreshWorkspaces(auth));
    }
  }, []);

  useEffect(() => {
    activeWorkspaceId.current = workspace?.id ?? null;
    void run(refreshSessions);
  }, [workspace?.id]);

  useEffect(() => {
    activeSessionId.current = session?.id ?? null;
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
      });
    });

    return () => events.close();
  }, [session?.id, session?.status, token]);

  function acceptAuth(nextAuth: AuthState) {
    saveAuth(nextAuth);
    setAuth(nextAuth);
    setNotice(`Signed in as ${nextAuth.user.display_name}`);
    void run(() => refreshWorkspaces(nextAuth));
  }

  function signOut() {
    clearAuth();
    setAuth(null);
    setWorkspaces([]);
    setWorkspace(null);
    setSessions([]);
    setSession(null);
    setResult(null);
  }

  if (!auth) {
    return (
      <main className="app-shell auth-shell">
        <AuthPanel onAuth={acceptAuth} onError={setError} />
        <StatusBar notice={notice} error={error} />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Decision Engine</p>
          <h1>Workspace decisions</h1>
        </div>
        <div className="user-strip">
          <span>{auth.user.display_name}</span>
          <button className="ghost-button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <StatusBar notice={notice} error={error} />

      <section className="workspace-layout">
        <aside className="sidebar">
          <WorkspacePanel
            workspaces={workspaces}
            active={workspace}
            onSelect={(next) => {
              activeWorkspaceId.current = next.id;
              activeSessionId.current = null;
              setWorkspace(next);
              setSessions(sessionsByWorkspace[next.id] ?? []);
              setSession(null);
              setResult(null);
            }}
            onCreate={(name) =>
              run(async () => {
                const created = await api.createWorkspace(token, { name, slug: slugify(name) || `workspace-${Date.now()}` });
                setWorkspaces((items) => [...items, created]);
                setWorkspace(created);
                setNotice('Workspace created.');
              })
            }
          />
        </aside>

        <section className="content-column">
          {workspace ? (
            <>
              <WorkspaceHeader
                workspace={workspace}
                onInvite={(email) =>
                  run(async () => {
                    await api.addMember(token, workspace.id, email);
                    setNotice('Member added.');
                  })
                }
              />
              <SessionBoard
                sessions={sessions}
                active={session}
                loading={loadingSessions}
                onSelect={(next) => {
                  activeSessionId.current = next.id;
                  setSession(next);
                  setResult(resultsBySession[next.id] ?? null);
                }}
                onCreate={(payload) =>
                  run(async () => {
                    const created = await api.createSession(token, workspace.id, payload);
                    const nextSessions = [created, ...sessions];
                    setSessions(nextSessions);
                    setSessionsByWorkspace((cache) => ({ ...cache, [workspace.id]: nextSessions }));
                    setSession(created);
                    setResult(null);
                    setNotice('Decision session created.');
                  })
                }
              />
              {session ? (
                <SessionDetail
                  session={session}
                  result={result}
                  loadingResult={loadingResult}
                  onAddOption={(title) =>
                    run(async () => {
                      await api.addOption(token, session.id, title);
                      await refreshSession(session);
                      await refreshSessions(workspace);
                      setNotice('Option added.');
                    })
                  }
                  onStatus={(status) =>
                    run(async () => {
                      const updated = await api.updateSessionStatus(token, session.id, status);
                      setSession(updated);
                      setSessions((items) => items.map((item) => (item.id === updated.id ? updated : item)));
                      await refreshSessions(workspace);
                      setNotice(status === 'OPEN' ? 'Voting opened.' : 'Session closed.');
                    })
                  }
                  onVote={(optionIds) =>
                    run(async () => {
                      await api.castVote(token, session, optionIds);
                      setNotice('Vote accepted. Waiting for the result worker.');
                    })
                  }
                />
              ) : (
                <EmptyState title="Select or create a session" text="Draft decisions, open them for voting, then watch result snapshots update." />
              )}
            </>
          ) : (
            <EmptyState title="Create a workspace" text="Workspaces isolate members, decisions, votes, and result streams." />
          )}
        </section>
      </section>
    </main>
  );
}

function AuthPanel({ onAuth, onError }: { onAuth: (auth: AuthState) => void; onError: (message: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    onError('');
    try {
      const auth =
        mode === 'register'
          ? await api.register({ email, password, display_name: displayName || email })
          : await api.login({ email, password });
      onAuth(auth);
    } catch (exception) {
      onError(exception instanceof Error ? exception.message : 'Authentication failed.');
    }
  }

  return (
    <section className="auth-panel">
      <p className="eyebrow">Decision Engine</p>
      <h1>Make the decision visible.</h1>
      <div className="segmented" role="group" aria-label="Authentication mode">
        <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
          Login
        </button>
        <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
          Register
        </button>
      </div>
      <form className="form-grid" onSubmit={submit}>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
        </label>
        {mode === 'register' ? (
          <label>
            Display name
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
          </label>
        ) : null}
        <button className="primary-button" type="submit">
          {mode === 'register' ? 'Create account' : 'Sign in'}
        </button>
      </form>
    </section>
  );
}

function StatusBar({ notice, error }: { notice: string; error: string }) {
  if (!notice && !error) {
    return null;
  }

  return (
    <div className={error ? 'status-bar error' : 'status-bar'} role="status">
      {error || notice}
    </div>
  );
}

function WorkspacePanel({
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

function WorkspaceHeader({ workspace, onInvite }: { workspace: Workspace; onInvite: (email: string) => void }) {
  const [email, setEmail] = useState('');

  return (
    <section className="workspace-header">
      <div>
        <p className="eyebrow">{workspace.slug}</p>
        <h2>{workspace.name}</h2>
      </div>
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
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required disabled={workspace.role !== 'OWNER'} />
        </label>
        <button className="secondary-button" type="submit" disabled={workspace.role !== 'OWNER'}>
          Invite
        </button>
      </form>
    </section>
  );
}

function SessionBoard({
  sessions,
  active,
  loading,
  onSelect,
  onCreate,
}: {
  sessions: DecisionSession[];
  active: DecisionSession | null;
  loading: boolean;
  onSelect: (session: DecisionSession) => void;
  onCreate: (payload: { title: string; description?: string; voting_type: VotingType }) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [votingType, setVotingType] = useState<VotingType>('MAJORITY');

  return (
    <section className="session-band">
      <form
        className="session-form"
        onSubmit={(event) => {
          event.preventDefault();
          onCreate({ title, description: description || undefined, voting_type: votingType });
          setTitle('');
          setDescription('');
        }}
      >
        <label>
          Decision title
          <input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <label>
          Notes
          <input value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label>
          Method
          <select value={votingType} onChange={(event) => setVotingType(event.target.value as VotingType)}>
            <option value="MAJORITY">Majority</option>
            <option value="RANKED_IRV">Ranked IRV</option>
          </select>
        </label>
        <button className="primary-button" type="submit">
          Create
        </button>
      </form>
      <div className="session-tabs" role="tablist" aria-label="Decision sessions">
        {loading ? <p className="inline-status">Refreshing sessions...</p> : null}
        {sessions.map((item) => (
          <button key={item.id} className={active?.id === item.id ? 'active' : ''} onClick={() => onSelect(item)}>
            {item.title}
            <small>{item.status}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function SessionDetail({
  session,
  result,
  loadingResult,
  onAddOption,
  onStatus,
  onVote,
}: {
  session: DecisionSession;
  result: SessionResult | null;
  loadingResult: boolean;
  onAddOption: (title: string) => void;
  onStatus: (status: 'OPEN' | 'CLOSED') => void;
  onVote: (optionIds: string[]) => void;
}) {
  const canOpen = session.status === 'DRAFT' && session.options.length >= 2;

  return (
    <section className="detail-grid">
      <div className="decision-pane">
        <p className="eyebrow">{session.voting_type}</p>
        <h2>{session.title}</h2>
        {session.description ? <p className="muted">{session.description}</p> : null}
        <div className="action-strip">
          <button className="secondary-button" onClick={() => onStatus('OPEN')} disabled={!canOpen}>
            Open voting
          </button>
          <button className="secondary-button" onClick={() => onStatus('CLOSED')} disabled={session.status !== 'OPEN'}>
            Close
          </button>
        </div>
        <OptionsPanel session={session} onAddOption={onAddOption} />
        {session.status === 'OPEN' ? <VotePanel session={session} onVote={onVote} /> : null}
      </div>
      <ResultsPanel session={session} result={result} loading={loadingResult} />
    </section>
  );
}

function OptionsPanel({ session, onAddOption }: { session: DecisionSession; onAddOption: (title: string) => void }) {
  const [title, setTitle] = useState('');

  return (
    <section className="options-panel">
      <h3>Options</h3>
      <ol className="option-list">
        {session.options.map((option) => (
          <li key={option.id}>{option.title}</li>
        ))}
      </ol>
      {session.status === 'DRAFT' ? (
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            onAddOption(title);
            setTitle('');
          }}
        >
          <label>
            Option title
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <button className="primary-button" type="submit">
            Add option
          </button>
        </form>
      ) : null}
    </section>
  );
}

function VotePanel({ session, onVote }: { session: DecisionSession; onVote: (optionIds: string[]) => void }) {
  const [choice, setChoice] = useState('');
  const [ranking, setRanking] = useState<string[]>([]);
  const remaining = useMemo(() => session.options.filter((option) => !ranking.includes(option.id)), [ranking, session.options]);

  if (session.voting_type === 'MAJORITY') {
    return (
      <section className="vote-panel">
        <h3>Cast vote</h3>
        <div className="choice-grid">
          {session.options.map((option) => (
            <label key={option.id} className={choice === option.id ? 'choice active' : 'choice'}>
              <input type="radio" name="majority-choice" value={option.id} checked={choice === option.id} onChange={() => setChoice(option.id)} />
              {option.title}
            </label>
          ))}
        </div>
        <button className="primary-button" disabled={!choice} onClick={() => onVote([choice])}>
          Submit vote
        </button>
      </section>
    );
  }

  return (
    <section className="vote-panel">
      <h3>Rank choices</h3>
      <div className="ranking-builder">
        <div>
          <p className="small-heading">Available</p>
          {remaining.map((option) => (
            <button key={option.id} className="list-row" onClick={() => setRanking((items) => [...items, option.id])}>
              {option.title}
            </button>
          ))}
        </div>
        <div>
          <p className="small-heading">Ranking</p>
          {ranking.map((id, index) => {
            const option = session.options.find((item) => item.id === id) as DecisionOption;
            return (
              <button key={id} className="list-row active" onClick={() => setRanking((items) => items.filter((item) => item !== id))}>
                {index + 1}. {option.title}
              </button>
            );
          })}
        </div>
      </div>
      <button className="primary-button" disabled={ranking.length === 0} onClick={() => onVote(ranking)}>
        Submit ranking
      </button>
    </section>
  );
}

function ResultsPanel({ session, result, loading }: { session: DecisionSession; result: SessionResult | null; loading: boolean }) {
  const winner = session.options.find((option) => option.id === result?.winning_option_id);

  return (
    <section className="results-pane" aria-label="Results">
      <p className="eyebrow">Live results</p>
      {loading ? <p className="inline-status">Refreshing result...</p> : null}
      {session.status === 'DRAFT' ? (
        <EmptyState title="No results yet" text="Open voting before result snapshots are computed." />
      ) : result ? (
        <>
          <h2>{winner ? winner.title : 'No winner yet'}</h2>
          <dl className="metric-grid">
            <div>
              <dt>Version</dt>
              <dd>{result.version}</dd>
            </div>
            <div>
              <dt>Votes</dt>
              <dd>{result.result_data.total_votes}</dd>
            </div>
          </dl>
          <RoundBreakdown session={session} rounds={result.result_data.rounds} winningOptionId={result.winning_option_id} />
        </>
      ) : (
        <EmptyState title="Waiting for snapshot" text="The vote write is durable. The worker will publish the next result update." />
      )}
    </section>
  );
}

function RoundBreakdown({
  session,
  rounds,
  winningOptionId,
}: {
  session: DecisionSession;
  rounds: Array<Record<string, unknown>>;
  winningOptionId: string | null;
}) {
  if (rounds.length === 0) {
    return (
      <div className="rounds">
        <h3>Result breakdown</h3>
        <p className="muted">No round details yet.</p>
      </div>
    );
  }

  return (
    <div className="rounds">
      <h3>Result breakdown</h3>
      {rounds.map((round, index) => (
        <RoundCard key={index} session={session} round={round} index={index} winningOptionId={winningOptionId} />
      ))}
    </div>
  );
}

function RoundCard({
  session,
  round,
  index,
  winningOptionId,
}: {
  session: DecisionSession;
  round: Record<string, unknown>;
  index: number;
  winningOptionId: string | null;
}) {
  const counts = normalizeCounts(round.counts);
  const maxVotes = Math.max(...counts.map((item) => item.votes), 0);
  const winnerId = typeof round.winner_option_id === 'string' ? round.winner_option_id : winningOptionId;
  const eliminatedId = typeof round.eliminated_option_id === 'string' ? round.eliminated_option_id : null;
  const roundType = typeof round.type === 'string' ? round.type.replace('_', ' ') : session.voting_type.replace('_', ' ');

  return (
    <section className="round-card">
      <div className="round-card-header">
        <div>
          <p className="eyebrow">Round {index + 1}</p>
          <h4>{roundType}</h4>
        </div>
        {typeof round.active_ballots === 'number' ? <span className="pill">{round.active_ballots} active ballots</span> : null}
      </div>
      <div className="result-list">
        {session.options.map((option) => {
          const votes = counts.find((item) => item.optionId === option.id)?.votes ?? 0;
          const width = maxVotes > 0 ? `${Math.max((votes / maxVotes) * 100, votes > 0 ? 6 : 0)}%` : '0%';

          return (
            <div key={option.id} className="result-row">
              <div className="result-row-label">
                <span>{option.title}</span>
                <strong>{votes}</strong>
              </div>
              <div className="result-bar" aria-hidden="true">
                <span style={{ width }} />
              </div>
              <div className="result-row-meta">
                {winnerId === option.id ? <span className="pill success">Winner</span> : null}
                {eliminatedId === option.id ? <span className="pill warning">Eliminated</span> : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function normalizeCounts(value: unknown): Array<{ optionId: string; votes: number }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }

  return Object.entries(value).map(([optionId, votes]) => ({
    optionId,
    votes: typeof votes === 'number' ? votes : Number(votes) || 0,
  }));
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <section className="empty-state">
      <h2>{title}</h2>
      <p>{text}</p>
    </section>
  );
}
