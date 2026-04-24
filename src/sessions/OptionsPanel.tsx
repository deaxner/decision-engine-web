import { useState } from 'react';
import type { DecisionSession } from '../types';

export function OptionsPanel({ session, onAddOption }: { session: DecisionSession; onAddOption: (title: string) => Promise<boolean> }) {
  const [title, setTitle] = useState('');

  return (
    <section className="options-panel">
      <div className="panel-section-heading">
        <h3>Proposed options</h3>
        <span className="decision-type-pill">{session.status === 'DRAFT' ? 'Draft phase' : 'Voting live'}</span>
      </div>
      <ol className="option-list">
        {session.options.map((option) => (
          <li key={option.id} className="option-card">
            <span className="option-marker" aria-hidden="true" />
            <div>
              <strong>{option.title}</strong>
            </div>
          </li>
        ))}
      </ol>
      {session.status === 'DRAFT' ? (
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            const nextTitle = title.trim();
            if (!nextTitle) {
              return;
            }
            void onAddOption(nextTitle).then((success) => {
              if (success) {
                setTitle('');
              }
            });
          }}
        >
          <label>
            Option title
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <button className="primary-button" type="submit">
            Add option
          </button>
        </form>
      ) : null}
    </section>
  );
}
