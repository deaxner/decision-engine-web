import { useState } from 'react';
import type { DecisionSession, VotingType } from '../types';

export function SessionBoard({
  sessions,
  active,
  loading,
  onSelect,
  onCreate,
}: {
  sessions: DecisionSession[];
  active: DecisionSession | null;
  loading: boolean;
  onSelect: (session: DecisionSession) => void;
  onCreate: (payload: { title: string; description?: string; voting_type: VotingType }) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [votingType, setVotingType] = useState<VotingType>('MAJORITY');

  return (
    <section className="session-band">
      <form
        className="session-form"
        onSubmit={(event) => {
          event.preventDefault();
          onCreate({ title, description: description || undefined, voting_type: votingType });
          setTitle('');
          setDescription('');
        }}
      >
        <label>
          Decision title
          <input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <label>
          Notes
          <input value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label>
          Method
          <select value={votingType} onChange={(event) => setVotingType(event.target.value as VotingType)}>
            <option value="MAJORITY">Majority</option>
            <option value="RANKED_IRV">Ranked IRV</option>
          </select>
        </label>
        <button className="primary-button" type="submit">
          Create
        </button>
      </form>
      <div className="session-tabs" role="tablist" aria-label="Decision sessions">
        {loading ? <p className="inline-status">Refreshing sessions...</p> : null}
        {sessions.map((item) => (
          <button key={item.id} className={active?.id === item.id ? 'active' : ''} onClick={() => onSelect(item)}>
            {item.title}
            <small>{item.status}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
