import { useState } from 'react';
import type { Workspace } from '../types';

export function WorkspaceHeader({ workspace, onInvite }: { workspace: Workspace; onInvite: (email: string) => void }) {
  const [email, setEmail] = useState('');

  return (
    <section className="workspace-header">
      <div>
        <p className="eyebrow">{workspace.slug}</p>
        <h2>{workspace.name}</h2>
      </div>
      <form
        className="invite-form"
        onSubmit={(event) => {
          event.preventDefault();
          onInvite(email);
          setEmail('');
        }}
      >
        <label>
          Member email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required disabled={workspace.role !== 'OWNER'} />
        </label>
        <button className="secondary-button" type="submit" disabled={workspace.role !== 'OWNER'}>
          Invite
        </button>
      </form>
    </section>
  );
}
