import { useEffect, useState } from 'react';
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
  createOpen,
  onCreateOpenChange,
  onSelect,
  onCreate,
}: {
  sessions: DecisionSession[];
  totalSessions: number;
  searchQuery: string;
  workspace: Workspace;
  active: DecisionSession | null;
  loading: boolean;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  onSelect: (session: DecisionSession) => void;
  onCreate: (payload: { title: string; description?: string; voting_type: VotingType }) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [votingType, setVotingType] = useState<VotingType>('MAJORITY');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [step, setStep] = useState(1);
  const [boardView, setBoardView] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const activeCount = workspace.session_counts.open;
  const draftCount = workspace.session_counts.draft;
  const closedCount = workspace.session_counts.closed;
  const filteredSessions = sessions.filter((item) => (boardView === 'ACTIVE' ? item.status !== 'CLOSED' : item.status === 'CLOSED'));

  useEffect(() => {
    if (!createOpen) {
      setTitle('');
      setDescription('');
      setVotingType('MAJORITY');
      setOptions(['', '']);
      setStep(1);
    }
  }, [createOpen]);

  const optionValues = options.map((item) => item.trim()).filter(Boolean);

  function submitCreate() {
    onCreate({ title, description: description || undefined, voting_type: votingType });
    onCreateOpenChange(false);
  }

  function updateOption(index: number, value: string) {
    setOptions((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  function addOptionField() {
    setOptions((current) => [...current, '']);
  }

  return (
    <section className="workspace-dashboard">
      <div className="dashboard-hero-grid">
        <section className="dashboard-hero-panel dashboard-hero-panel-compact">
          <div className="section-heading session-heading">
            <div>
              <p className="small-heading">Workspace overview</p>
              <h2>Decision board</h2>
            </div>
            <p className="muted">Draft, open, and closed decisions stay visible in one board so the workspace state is immediately understandable.</p>
          </div>
          <div className="dashboard-overview-grid">
            <article className="overview-card">
              <span className="small-heading">Open now</span>
              <strong>{activeCount}</strong>
              <p>Sessions currently collecting live votes.</p>
            </article>
            <article className="overview-card">
              <span className="small-heading">Draft queue</span>
              <strong>{draftCount}</strong>
              <p>Proposals still shaping options and framing.</p>
            </article>
            <article className="overview-card">
              <span className="small-heading">Closed record</span>
              <strong>{closedCount}</strong>
              <p>Finalized decisions retained as accountable history.</p>
            </article>
          </div>
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
            <p className="muted">Review active and archived decisions without stretching the page with inline creation forms.</p>
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

      {createOpen ? (
        <div className="modal-overlay" role="presentation" onClick={() => onCreateOpenChange(false)}>
          <section
            className="session-modal"
            aria-labelledby="create-decision-title"
            aria-modal="true"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="session-modal-header">
              <div>
                <p className="small-heading">Create decision</p>
                <h2 id="create-decision-title">Start a new decision</h2>
              </div>
              <button className="icon-button session-modal-close" type="button" aria-label="Close create decision modal" onClick={() => onCreateOpenChange(false)}>
                x
              </button>
            </div>
            <p className="muted">Define the decision, choose the voting method, and line up options before the draft is created.</p>
            <form
              className="dashboard-session-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (step < 3) {
                  setStep((current) => current + 1);
                  return;
                }
                submitCreate();
              }}
            >
              <div className="composer-stepper" aria-label="Create decision steps">
                <div className={step >= 1 ? 'composer-step active' : 'composer-step'}>
                  <span>1</span>
                  <div>
                    <strong>Name</strong>
                    <small>Title and context</small>
                  </div>
                </div>
                <div className={step >= 2 ? 'composer-step active' : 'composer-step'}>
                  <span>2</span>
                  <div>
                    <strong>Type</strong>
                    <small>Voting method</small>
                  </div>
                </div>
                <div className={step >= 3 ? 'composer-step active' : 'composer-step'}>
                  <span>3</span>
                  <div>
                    <strong>Options</strong>
                    <small>Choices to compare</small>
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
                    <p className="small-heading">Voting profile</p>
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
                <div className="dashboard-session-form">
                  <div className="option-builder-list">
                    {options.map((option, index) => (
                      <label key={index}>
                        Option {index + 1}
                        <input value={option} onChange={(event) => updateOption(index, event.target.value)} placeholder={`Option ${index + 1}`} />
                      </label>
                    ))}
                  </div>
                  <div className="rail-inline-actions">
                    <button className="secondary-button" type="button" onClick={addOptionField}>
                      Add option
                    </button>
                  </div>
                  <div className="composer-method-card" aria-live="polite">
                    <p className="small-heading">Ready to create</p>
                    <h3>{title || 'Untitled decision'}</h3>
                    <p className="muted">
                      {optionValues.length >= 2
                        ? `${optionValues.length} options will be available immediately in draft.`
                        : 'Add at least two options now, or continue editing after the draft is created.'}
                    </p>
                  </div>
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
                    Create decision
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
