import { useState } from 'react';
import type { DecisionSession, VotingType, Workspace } from '../types';
import './sessions.css';

function statusLabel(status: DecisionSession['status']) {
  if (status === 'OPEN') {
    return 'Open';
  }
  if (status === 'CLOSED') {
    return 'Closed';
  }
  return 'Draft';
}

function methodLabel(votingType: VotingType) {
  return votingType === 'RANKED_IRV' ? 'Ranked IRV' : 'Majority';
}

export function SessionBoard({
  sessions,
  totalSessions,
  searchQuery,
  workspace,
  active,
  loading,
  onSelect,
  onCreate,
}: {
  sessions: DecisionSession[];
  totalSessions: number;
  searchQuery: string;
  workspace: Workspace;
  active: DecisionSession | null;
  loading: boolean;
  onSelect: (session: DecisionSession) => void;
  onCreate: (payload: { title: string; description?: string; voting_type: VotingType }) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [votingType, setVotingType] = useState<VotingType>('MAJORITY');
  const [step, setStep] = useState(1);
  const [boardView, setBoardView] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const activeCount = workspace.session_counts.open;
  const draftCount = workspace.session_counts.draft;
  const closedCount = workspace.session_counts.closed;
  const filteredSessions = sessions.filter((item) => (boardView === 'ACTIVE' ? item.status !== 'CLOSED' : item.status === 'CLOSED'));

  function resetComposer() {
    setTitle('');
    setDescription('');
    setVotingType('MAJORITY');
    setStep(1);
  }

  return (
    <section className="workspace-dashboard">
      <div className="dashboard-hero-grid">
        <section className="dashboard-hero-panel">
          <div className="section-heading session-heading">
            <div>
              <p className="small-heading">Create decision</p>
              <h2>Propose a new decision</h2>
            </div>
            <p className="muted">Create a session, define the method, and move it into formal voting once options are ready.</p>
          </div>
          <form
            className="dashboard-session-form"
            onSubmit={(event) => {
              event.preventDefault();
              onCreate({ title, description: description || undefined, voting_type: votingType });
              resetComposer();
            }}
          >
            <div className="composer-stepper" aria-label="Create decision steps">
              <div className={step >= 1 ? 'composer-step active' : 'composer-step'}>
                <span>1</span>
                <div>
                  <strong>Context</strong>
                  <small>Title and strategic notes</small>
                </div>
              </div>
              <div className={step >= 2 ? 'composer-step active' : 'composer-step'}>
                <span>2</span>
                <div>
                  <strong>Method</strong>
                  <small>Voting protocol</small>
                </div>
              </div>
              <div className={step >= 3 ? 'composer-step active' : 'composer-step'}>
                <span>3</span>
                <div>
                  <strong>Review</strong>
                  <small>Submit to board</small>
                </div>
              </div>
            </div>

            {step === 1 ? (
              <div className="dashboard-session-grid">
                <label>
                  Decision title
                  <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Infrastructure migration roadmap 2026" required />
                </label>
                <label>
                  Strategic notes
                  <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Define the context and expected outcome" />
                </label>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="dashboard-session-grid">
                <label>
                  Method
                  <select value={votingType} onChange={(event) => setVotingType(event.target.value as VotingType)}>
                    <option value="MAJORITY">Majority</option>
                    <option value="RANKED_IRV">Ranked IRV</option>
                  </select>
                </label>
                <div className="composer-method-card" aria-live="polite">
                  <p className="small-heading">Selected method</p>
                  <h3>{methodLabel(votingType)}</h3>
                  <p className="muted">
                    {votingType === 'RANKED_IRV'
                      ? 'Stakeholders rank options in order, then rounds eliminate lower-ranked choices until a winner remains.'
                      : 'Each stakeholder selects a single option and the highest total wins.'}
                  </p>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="composer-review-card" aria-live="polite">
                <p className="small-heading">Review decision</p>
                <h3>{title || 'Untitled decision'}</h3>
                <dl>
                  <div>
                    <dt>Method</dt>
                    <dd>{methodLabel(votingType)}</dd>
                  </div>
                  <div>
                    <dt>Notes</dt>
                    <dd>{description || 'No strategic notes provided.'}</dd>
                  </div>
                </dl>
              </div>
            ) : null}

            <div className="dashboard-session-actions">
              {step > 1 ? (
                <button className="secondary-button" type="button" onClick={() => setStep((current) => current - 1)}>
                  Back
                </button>
              ) : null}
              {step < 3 ? (
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => setStep((current) => current + 1)}
                  disabled={step === 1 && title.trim().length === 0}
                >
                  Next
                </button>
              ) : (
                <button className="primary-button" type="submit" disabled={title.trim().length === 0}>
                  Propose decision
                </button>
              )}
            </div>
          </form>
        </section>
        <aside className="dashboard-metrics">
          <article className="dashboard-metric-card dashboard-metric-card-primary">
            <p className="small-heading">Consensus reach</p>
            <strong>{workspace.participation_rate}%</strong>
            <span>{activeCount} active sessions are currently collecting votes.</span>
          </article>
          <article className="dashboard-metric-card">
            <div className="dashboard-metric-row">
              <h3>Active polls</h3>
              <strong>{activeCount}</strong>
            </div>
            <div className="dashboard-chip-list">
              <span>Drafts: {draftCount}</span>
              <span>Closed: {closedCount}</span>
              <span>Members: {workspace.member_count}</span>
            </div>
          </article>
        </aside>
      </div>

      <section className="session-band">
        <div className="board-header">
          <div className="section-heading board-heading-copy">
            <div>
              <p className="small-heading">Decision board</p>
              <h2>Decision board</h2>
            </div>
            <p className="muted">Draft, open, and closed decisions stay visible in one board so the workspace state is immediately understandable.</p>
          </div>
          <div className="board-filter">
            <button className={boardView === 'ACTIVE' ? 'active' : ''} type="button" onClick={() => setBoardView('ACTIVE')}>
              Active
            </button>
            <button className={boardView === 'ARCHIVED' ? 'active' : ''} type="button" onClick={() => setBoardView('ARCHIVED')}>
              Archived
            </button>
          </div>
        </div>
        {loading ? <p className="inline-status">Refreshing sessions...</p> : null}
        <div className="decision-board-grid" role="tablist" aria-label="Decision sessions">
          {totalSessions === 0 ? (
            <article className="decision-card decision-card-empty">
              <h3>No decisions yet</h3>
              <p>Create the first decision for this workspace to start building a visible decision record.</p>
            </article>
          ) : filteredSessions.length === 0 ? (
            <article className="decision-card decision-card-empty">
              <h3>No decisions in this view</h3>
              <p>
                {searchQuery.trim().length > 0
                  ? `No ${boardView.toLowerCase()} decisions match "${searchQuery.trim()}".`
                  : `There are no ${boardView.toLowerCase()} decisions in this workspace yet.`}
              </p>
            </article>
          ) : (
            filteredSessions.map((item) => (
              <button key={item.id} className={active?.id === item.id ? 'decision-card active' : 'decision-card'} onClick={() => onSelect(item)}>
                <div className="decision-card-header">
                  <span className={`status-pill status-pill-${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description ?? 'No strategic notes yet.'}</p>
                <div className="decision-card-footer">
                  <span>{methodLabel(item.voting_type)}</span>
                  <span>{item.options.length} options</span>
                </div>
              </button>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
