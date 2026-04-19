import { OptionsPanel } from './OptionsPanel';
import { VotePanel } from './VotePanel';
import { ResultsPanel } from '../results/ResultsPanel';
import type { DecisionSession, SessionResult } from '../types';
import './sessions.css';

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
            <span className="decision-type-pill">{session.voting_type === 'RANKED_IRV' ? 'Ranked IRV' : 'Majority vote'}</span>
            <span className="decision-type-pill">{session.status}</span>
          </div>
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
