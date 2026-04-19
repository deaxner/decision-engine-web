import { OptionsPanel } from './OptionsPanel';
import { VotePanel } from './VotePanel';
import { ResultsPanel } from '../results/ResultsPanel';
import type { DecisionSession, SessionResult } from '../types';
import { dueLabel } from './SessionBoard';
import './sessions.css';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function SessionDetail({
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
        <header className="decision-header">
          <p className="eyebrow">Decision protocol</p>
          <h1>{session.title}</h1>
          {session.description ? <p className="decision-description">{session.description}</p> : null}
          <div className="decision-meta-row">
            <span className="decision-type-pill">{session.category || 'No category'}</span>
            <span className={dueLabel(session.due_at ?? null) === 'Overdue' ? 'decision-type-pill decision-type-pill-warning' : 'decision-type-pill'}>
              {dueLabel(session.due_at ?? null)}
            </span>
            <span className="decision-type-pill">{session.voting_type === 'RANKED_IRV' ? 'Ranked IRV' : 'Majority vote'}</span>
            <span className="decision-type-pill">{session.status}</span>
          </div>
          {(session.assignees ?? []).length > 0 ? (
            <div className="decision-assignees" aria-label="Assigned stakeholders">
              {(session.assignees ?? []).map((assignee) => (
                <span key={assignee.id} className="decision-assignee-chip" title={assignee.email}>
                  <strong>{initials(assignee.display_name)}</strong>
                  {assignee.display_name}
                </span>
              ))}
            </div>
          ) : null}
        </header>
        <div className="action-strip">
          <button className="primary-button" onClick={() => onStatus('OPEN')} disabled={!canOpen}>
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
