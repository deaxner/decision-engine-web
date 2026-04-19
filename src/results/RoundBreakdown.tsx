import type { DecisionSession } from '../types';

export function RoundBreakdown({
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
