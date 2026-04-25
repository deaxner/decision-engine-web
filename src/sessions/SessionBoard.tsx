import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { DecisionSession, VotingType, Workspace, WorkspaceDashboard, WorkspaceMember } from '../types';
import { useDialogFocusTrap } from '../shared/useDialogFocusTrap';
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

export function dueLabel(value: string | null) {
  if (!value) {
    return 'No due date';
  }

  const now = new Date();
  const dueAt = new Date(value);
  if (Number.isNaN(dueAt.getTime())) {
    return 'No due date';
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dueDay = new Date(dueAt.getFullYear(), dueAt.getMonth(), dueAt.getDate()).getTime();
  const days = Math.ceil((dueDay - today) / 86_400_000);

  if (days < 0) {
    return 'Overdue';
  }
  if (days === 0) {
    return 'Due today';
  }
  if (days === 1) {
    return 'Due tomorrow';
  }

  return `Due in ${days} days`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function dateInputToIso(value: string) {
  if (!value) {
    return undefined;
  }

  return new Date(`${value}T12:00:00`).toISOString();
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
  members,
  loadingMembers,
  createOpen,
  canCreateDecision,
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
  members: WorkspaceMember[];
  loadingMembers: boolean;
  createOpen: boolean;
  canCreateDecision: boolean;
  onCreateOpenChange: (open: boolean) => void;
  onSelect: (session: DecisionSession) => void;
  onSelectActivitySession: (sessionId: string) => void;
  onRetryDashboard: () => void;
  onCreate: (payload: { title: string; description?: string; voting_type: VotingType; category?: string; due_at?: string; assignee_ids?: string[]; option_titles?: string[] }) => Promise<boolean>;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [votingType, setVotingType] = useState<VotingType>('MAJORITY');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [step, setStep] = useState(1);
  const [boardView, setBoardView] = useState<BoardView>('ACTIVE');
  const boardPanelId = useId();
  const dialogTitleId = useId();
  const dialogRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<Record<BoardView, HTMLButtonElement | null>>({
    ACTIVE: null,
    DRAFT: null,
    ARCHIVED: null,
  });
  useDialogFocusTrap({
    active: createOpen,
    dialogRef,
    onClose: () => onCreateOpenChange(false),
  });

  useEffect(() => {
    if (!createOpen) {
      setTitle('');
      setDescription('');
      setCategory('');
      setDueAt('');
      setAssigneeIds([]);
      setVotingType('MAJORITY');
      setOptions(['', '']);
      setStep(1);
    }
  }, [createOpen]);

  const optionValues = options.map((item) => item.trim()).filter(Boolean);
  const uniqueOptionValues = Array.from(new Set(optionValues));
  const canSubmitCreate = title.trim().length > 0 && uniqueOptionValues.length >= 2;
  const grouped = boardGroups(sessions);
  const visibleSessions = grouped[boardView];
  const dashboardWorkspace = dashboard?.workspace ?? workspace;
  const metrics = dashboard?.metrics;
  const insights = dashboard?.insights ?? [];
  const activity = dashboard?.activity ?? [];

  function focusBoardTab(nextView: BoardView) {
    setBoardView(nextView);
    tabRefs.current[nextView]?.focus();
  }

  function handleTabKeyDown(currentView: BoardView, event: ReactKeyboardEvent<HTMLButtonElement>) {
    const tabs: BoardView[] = ['ACTIVE', 'DRAFT', 'ARCHIVED'];
    const currentIndex = tabs.indexOf(currentView);
    if (currentIndex === -1) {
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusBoardTab(tabs[(currentIndex + 1) % tabs.length]);
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusBoardTab(tabs[(currentIndex - 1 + tabs.length) % tabs.length]);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      focusBoardTab(tabs[0]);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      focusBoardTab(tabs[tabs.length - 1]);
    }
  }

  async function submitCreate() {
    if (!canSubmitCreate) {
      return;
    }

    const created = await onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      voting_type: votingType,
      category: category.trim() || undefined,
      due_at: dateInputToIso(dueAt),
      assignee_ids: assigneeIds,
      option_titles: uniqueOptionValues,
    });
    if (created) {
      onCreateOpenChange(false);
    }
  }

  function updateOption(index: number, value: string) {
    setOptions((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  function addOptionField() {
    setOptions((current) => [...current, '']);
  }

  function toggleAssignee(userId: string) {
    setAssigneeIds((current) => (current.includes(userId) ? current.filter((item) => item !== userId) : [...current, userId]));
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
          <div className="decision-board-tabs" role="tablist" aria-label="Decision board views" aria-orientation="horizontal">
            <button
              aria-controls={boardPanelId}
              aria-selected={boardView === 'ACTIVE'}
              className={boardView === 'ACTIVE' ? 'active' : ''}
              id="board-tab-active"
              role="tab"
              tabIndex={boardView === 'ACTIVE' ? 0 : -1}
              type="button"
              ref={(element) => {
                tabRefs.current.ACTIVE = element;
              }}
              onKeyDown={(event) => handleTabKeyDown('ACTIVE', event)}
              onClick={() => setBoardView('ACTIVE')}
            >
              Active Decisions
            </button>
            <button
              aria-controls={boardPanelId}
              aria-selected={boardView === 'DRAFT'}
              className={boardView === 'DRAFT' ? 'active' : ''}
              id="board-tab-draft"
              role="tab"
              tabIndex={boardView === 'DRAFT' ? 0 : -1}
              type="button"
              ref={(element) => {
                tabRefs.current.DRAFT = element;
              }}
              onKeyDown={(event) => handleTabKeyDown('DRAFT', event)}
              onClick={() => setBoardView('DRAFT')}
            >
              Draft Items
            </button>
            <button
              aria-controls={boardPanelId}
              aria-selected={boardView === 'ARCHIVED'}
              className={boardView === 'ARCHIVED' ? 'active' : ''}
              id="board-tab-archived"
              role="tab"
              tabIndex={boardView === 'ARCHIVED' ? 0 : -1}
              type="button"
              ref={(element) => {
                tabRefs.current.ARCHIVED = element;
              }}
              onKeyDown={(event) => handleTabKeyDown('ARCHIVED', event)}
              onClick={() => setBoardView('ARCHIVED')}
            >
              Archived Log
            </button>
          </div>

          {loading ? <p className="inline-status">Refreshing sessions...</p> : null}

          <div
            aria-labelledby={boardView === 'ACTIVE' ? 'board-tab-active' : boardView === 'DRAFT' ? 'board-tab-draft' : 'board-tab-archived'}
            className="decision-stream"
            id={boardPanelId}
            role="tabpanel"
          >
            {visibleSessions.length > 0 ? (
              visibleSessions.map((item) => (
                <button key={item.id} className={active?.id === item.id ? 'decision-stream-card active' : 'decision-stream-card'} type="button" onClick={() => onSelect(item)}>
                  <div className="decision-stream-header">
                    <div className="decision-stream-meta">
                      <span className={`status-pill status-pill-${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span>
                      <span className="decision-stream-node">{item.category || 'No category'}</span>
                    </div>
                    {(item.assignees ?? []).length > 0 ? (
                      <div className="decision-avatar-stack" aria-label="Assigned stakeholders">
                        {(item.assignees ?? []).slice(0, 3).map((assignee) => (
                          <span key={assignee.id} title={assignee.display_name}>
                            {initials(assignee.display_name)}
                          </span>
                        ))}
                        {(item.assignees ?? []).length > 3 ? <span>+{(item.assignees ?? []).length - 3}</span> : null}
                      </div>
                    ) : null}
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description ?? 'No strategic notes yet.'}</p>
                  <div className="decision-stream-footer">
                    <div>
                      <span className="decision-stream-foot-label">{item.options.length} options</span>
                    </div>
                    <div>
                      <span className="decision-stream-foot-accent">{dueLabel(item.due_at ?? null)}</span>
                    </div>
                    <div>
                      <span className="decision-stream-foot-label">{methodLabel(item.voting_type)}</span>
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

      {createOpen && canCreateDecision ? (
        <div className="modal-overlay" role="presentation" onClick={() => onCreateOpenChange(false)}>
          <section
            className="session-modal"
            aria-labelledby={dialogTitleId}
            aria-modal="true"
            ref={dialogRef}
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="session-modal-header">
              <div>
                <p className="small-heading">Create decision</p>
                <h2 id={dialogTitleId}>Start a new decision</h2>
              </div>
              <button className="icon-button session-modal-close" type="button" aria-label="Close create decision modal" onClick={() => onCreateOpenChange(false)}>
                x
              </button>
            </div>
            <form
              className="dashboard-session-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (step < 3) {
                  setStep((current) => current + 1);
                  return;
                }
                void submitCreate();
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
                    Category / node
                    <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Infrastructure" />
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
                  <label>
                    Due date
                    <input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
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
                      {uniqueOptionValues.length >= 2
                        ? `${uniqueOptionValues.length} unique options will be available immediately in draft.`
                        : 'Add at least two unique options before creating the draft.'}
                    </p>
                  </div>
                  <div className="assignee-picker">
                    <div>
                      <p className="small-heading">Assigned stakeholders</p>
                      <p className="muted">{loadingMembers ? 'Loading workspace members...' : 'Select existing workspace members for required sign-off.'}</p>
                    </div>
                    {members.length > 0 ? (
                      <div className="assignee-list">
                        {members.map((member) => (
                          <label key={member.id} className="assignee-choice">
                            <input
                              type="checkbox"
                              checked={assigneeIds.includes(member.id)}
                              onChange={() => toggleAssignee(member.id)}
                            />
                            <span className="assignee-avatar">{initials(member.display_name)}</span>
                            <span>
                              <strong>{member.display_name}</strong>
                              <small>{member.email}</small>
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="inline-status">No workspace members are available for assignment yet.</p>
                    )}
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
                  <button className="primary-button" type="submit" disabled={!canSubmitCreate}>
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
