import { EmptyState } from '../shared/EmptyState';
import { RoundBreakdown } from './RoundBreakdown';
import type { DecisionSession, SessionResult } from '../types';

export function ResultsPanel({ session, result, loading }: { session: DecisionSession; result: SessionResult | null; loading: boolean }) {
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
