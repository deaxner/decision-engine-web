import { OptionsPanel } from './OptionsPanel';
import { VotePanel } from './VotePanel';
import { ResultsPanel } from '../results/ResultsPanel';
import type { DecisionSession, SessionResult } from '../types';

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
