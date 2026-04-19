import { FormEvent, useState } from 'react';
import { api } from '../api';
import type { AuthState } from '../types';

export function AuthPanel({ onAuth, onError }: { onAuth: (auth: AuthState) => void; onError: (message: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    onError('');
    try {
      const auth =
        mode === 'register'
          ? await api.register({ email, password, display_name: displayName || email })
          : await api.login({ email, password });
      onAuth(auth);
    } catch (exception) {
      onError(exception instanceof Error ? exception.message : 'Authentication failed.');
    }
  }

  return (
    <section className="auth-panel">
      <p className="eyebrow">Secure workspace access</p>
      <h2>{mode === 'register' ? 'Create your ledger' : 'Sign in to Decision Ledger'}</h2>
      <p className="auth-panel-intro">Continue with email and password to reach your decision workspace.</p>
      <div className="segmented" role="group" aria-label="Authentication mode">
        <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
          Login
        </button>
        <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
          Register
        </button>
      </div>
      <form className="form-grid" onSubmit={submit}>
        <label>
          Workspace email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="name@company.com" required />
        </label>
        <label>
          Security key
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder=".........." required />
        </label>
        {mode === 'register' ? (
          <label>
            Display name
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" required />
          </label>
        ) : null}
        <button className="primary-button" type="submit">
          {mode === 'register' ? 'Create ledger account' : 'Enter workspace'}
        </button>
      </form>
    </section>
  );
}
