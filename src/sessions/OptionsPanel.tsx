import { useState } from 'react';
import type { DecisionSession } from '../types';

export function OptionsPanel({ session, onAddOption }: { session: DecisionSession; onAddOption: (title: string) => void }) {
  const [title, setTitle] = useState('');

  return (
    <section className="options-panel">
      <h3>Options</h3>
      <ol className="option-list">
        {session.options.map((option) => (
          <li key={option.id}>{option.title}</li>
        ))}
      </ol>
      {session.status === 'DRAFT' ? (
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            onAddOption(title);
            setTitle('');
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
