import { useEffect, useState } from 'react';
import type { DecisionSession, VotingType, Workspace, WorkspaceDashboard } from '../types';
import './sessions.css';

function statusLabel(status: DecisionSession['status']) {
  if (status === 'OPEN') {
    return 'Open';
  }
  if (status === 'CLOSED') {
    return 'Archived';
  }
  return 'Draft';
}

function methodLabel(votingType: VotingType) {
  return votingType === 'RANKED_IRV' ? 'Ranked IRV' : 'Majority';
}

function relativeLabel(session: DecisionSession) {
  if (session.status === 'OPEN') {
    return 'Voting open';
  }
  if (session.status === 'DRAFT') {
    return 'Draft queue';
  }
  return 'Archived record';
}

function boardGroups(items: DecisionSession[]) {
  return {
    ACTIVE: items.filter((item) => item.status === 'OPEN'),
    DRAFT: items.filter((item) => item.status === 'DRAFT'),
    ARCHIVED: items.filter((item) => item.status === 'CLOSED'),
  };
}

function formatDecisionSpeed(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return 'No history yet';
  }

  return `${value.toFixed(1)} Days`;
}

function formatActivityTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

type BoardView = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

export function SessionBoard({
  workspace,
  sessions,
  active,
  loading,
  dashboard,
  loadingDashboard,
  dashboardError,
  createOpen,
  onCreateOpenChange,
  onSelect,
  onSelectActivitySession,
  onRetryDashboard,
  onCreate,
}: {
  workspace: Workspace;
  sessions: DecisionSession[];
  active: DecisionSession | null;
  loading: boolean;
  dashboard: WorkspaceDashboard | null;
  loadingDashboard: boolean;
  dashboardError: string;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  onSelect: (session: DecisionSession) => void;
  onSelectActivitySession: (sessionId: string) => void;
  onRetryDashboard: () => void;
  onCreate: (payload: { title: string; description?: string; voting_type: VotingType }) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [votingType, setVotingType] = useState<VotingType>('MAJORITY');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [step, setStep] = useState(1);
  const [boardView, setBoardView] = useState<BoardView>('ACTIVE');

  useEffect(() => {
    if (!createOpen) {
      setTitle('');
      setDescription('');
      setVotingType('MAJORITY');
      setOptions(['', '']);
      setStep(1);
    }
  }, [createOpen]);

  useEffect(() => {
    if (boardView === 'ACTIVE' && workspace.session_counts.open === 0 && workspace.session_counts.draft > 0) {
      setBoardView('DRAFT');
    }
  }, [boardView, workspace.session_counts.draft, workspace.session_counts.open]);

  const optionValues = options.map((item) => item.trim()).filter(Boolean);
  const grouped = boardGroups(sessions);
  const visibleSessions = grouped[boardView];
  const dashboardWorkspace = dashboard?.workspace ?? workspace;
  const metrics = dashboard?.metrics;
  const insights = dashboard?.insights ?? [];
  const activity = dashboard?.activity ?? [];

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
      <section className="workspace-health">
        <div className="workspace-health-header">
          <div>
            <p className="small-heading">Current workspace</p>
            <h2>{dashboardWorkspace.name}</h2>
          </div>
          <div className="workspace-health-pill">
            <span className="workspace-health-pill-dot" />
            <span>
              {dashboardWorkspace.session_counts.open} Active Session{dashboardWorkspace.session_counts.open === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        {loadingDashboard ? <p className="inline-status">Loading dashboard analytics...</p> : null}
        {dashboardError ? (
          <div className="dashboard-error" role="status">
            <span>{dashboardError}</span>
            <button className="secondary-button" type="button" onClick={onRetryDashboard}>
              Retry
            </button>
          </div>
        ) : null}
        <div className="workspace-health-grid">
          <article className="health-card">
            <span className="health-card-icon">CR</span>
            <div>
              <h3>{dashboardWorkspace.participation_rate}% Consensus Reach</h3>
              <div className="health-progress">
                <span style={{ width: `${Math.max(dashboardWorkspace.participation_rate, 8)}%` }} />
              </div>
            </div>
          </article>
          <article className="health-card">
            <span className="health-card-icon">DS</span>
            <div>
              <h3>Avg. Decision Speed</h3>
              <p>{formatDecisionSpeed(metrics?.decision_speed_days)}</p>
            </div>
          </article>
          <article className="health-card">
            <span className="health-card-icon">ER</span>
            <div>
              <h3>Stakeholder Participation</h3>
              <p>{metrics?.engagement_rate ?? 0}% Engagement</p>
            </div>
          </article>
        </div>
      </section>

      <section className="workspace-board-layout">
        <div className="workspace-board-main">
          <div className="decision-board-tabs" role="tablist" aria-label="Decision board views">
            <button className={boardView === 'ACTIVE' ? 'active' : ''} type="button" onClick={() => setBoardView('ACTIVE')}>
              Active Decisions
            </button>
            <button className={boardView === 'DRAFT' ? 'active' : ''} type="button" onClick={() => setBoardView('DRAFT')}>
              Draft Items
            </button>
            <button className={boardView === 'ARCHIVED' ? 'active' : ''} type="button" onClick={() => setBoardView('ARCHIVED')}>
              Archived Log
            </button>
          </div>

          {loading ? <p className="inline-status">Refreshing sessions...</p> : null}

          <div className="decision-stream">
            {visibleSessions.length > 0 ? (
              visibleSessions.map((item) => (
                <button key={item.id} className={active?.id === item.id ? 'decision-stream-card active' : 'decision-stream-card'} type="button" onClick={() => onSelect(item)}>
                  <div className="decision-stream-header">
                    <div className="decision-stream-meta">
                      <span className={`status-pill status-pill-${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span>
                      <span className="decision-stream-node">{methodLabel(item.voting_type)}</span>
                    </div>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description ?? 'No strategic notes yet.'}</p>
                  <div className="decision-stream-footer">
                    <div>
                      <span className="decision-stream-foot-label">{item.options.length} options</span>
                    </div>
                    <div>
                      <span className="decision-stream-foot-accent">{relativeLabel(item)}</span>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <article className="decision-stream-card decision-stream-card-empty">
                <h3>No decisions in this view</h3>
                <p>
                  {boardView === 'ACTIVE'
                    ? 'Open decisions will appear here once voting begins.'
                    : boardView === 'DRAFT'
                      ? 'Draft decisions will appear here while teams shape options.'
                      : 'Closed decisions stay here as the permanent log.'}
                </p>
              </article>
            )}
          </div>
        </div>

        <aside className="workspace-side-rail">
          <section className="workspace-side-section">
            <h4>Recent Insights</h4>
            <div className="insight-stack">
              {insights.length > 0 ? (
                insights.map((insight) => (
                  <article key={insight.id} className={insight.severity === 'warning' ? 'insight-card insight-card-accent' : 'insight-card'}>
                    <p>{insight.title}</p>
                    <span>{insight.body}</span>
                  </article>
                ))
              ) : (
                <article className="insight-card">
                  <p>No insights yet</p>
                  <span>Rule-based insights will appear once there is enough workspace activity.</span>
                </article>
              )}
            </div>
          </section>

          <section className="workspace-side-section">
            <h4>Team Activity</h4>
            <div className="activity-stack">
              {activity.length > 0 ? (
                activity.map((item) => {
                  const initials =
                    item.actor?.display_name
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase())
                      .join('') || 'DL';
                  const content = (
                    <>
                      <div className="activity-avatar">{initials}</div>
                      <div>
                        <p>{item.summary}</p>
                        <span>{formatActivityTime(item.created_at)}</span>
                      </div>
                    </>
                  );

                  return item.session_id ? (
                    <button key={item.id} className="activity-row activity-row-button" type="button" onClick={() => onSelectActivitySession(item.session_id as string)}>
                      {content}
                    </button>
                  ) : (
                    <article key={item.id} className="activity-row">
                      {content}
                    </article>
                  );
                })
              ) : (
                <article className="insight-card">
                  <p>No activity yet</p>
                  <span>Workspace activity will appear once collaborators start drafting and voting.</span>
                </article>
              )}
            </div>
          </section>

          <button className="workspace-side-button" type="button" onClick={onRetryDashboard}>
            Refresh activity
          </button>
        </aside>
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
