import { useEffect, useMemo, useState } from 'react';
import type { DecisionOption, DecisionSession } from '../types';

export function VotePanel({ session, onVote }: { session: DecisionSession; onVote: (optionIds: string[]) => Promise<boolean> }) {
  const [choice, setChoice] = useState('');
  const [ranking, setRanking] = useState<string[]>([]);
  const remaining = useMemo(() => session.options.filter((option) => !ranking.includes(option.id)), [ranking, session.options]);

  useEffect(() => {
    setChoice('');
    setRanking([]);
  }, [session.id]);

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
        <button className="primary-button" type="button" disabled={!choice} onClick={() => void onVote([choice])}>
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
            <button key={option.id} className="list-row" type="button" onClick={() => setRanking((items) => [...items, option.id])}>
              {option.title}
            </button>
          ))}
        </div>
        <div>
          <p className="small-heading">Ranking</p>
          {ranking.map((id, index) => {
            const option = session.options.find((item) => item.id === id) as DecisionOption;
            return (
              <button key={id} className="list-row active" type="button" onClick={() => setRanking((items) => items.filter((item) => item !== id))}>
                {index + 1}. {option.title}
              </button>
            );
          })}
        </div>
      </div>
      <button className="primary-button" type="button" disabled={ranking.length === 0} onClick={() => void onVote(ranking)}>
        Submit ranking
      </button>
    </section>
  );
}
