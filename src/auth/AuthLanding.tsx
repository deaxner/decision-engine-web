import { AuthPanel } from './AuthPanel';
import { StatusBar } from '../shared/StatusBar';
import type { AuthState } from '../types';

export function AuthLanding({
  notice,
  error,
  onAuth,
  onError,
}: {
  notice: string;
  error: string;
  onAuth: (auth: AuthState) => void;
  onError: (message: string) => void;
}) {
  return (
    <div className="auth-page">
      <nav className="auth-nav" aria-label="Decision Ledger">
        <strong>Decision Ledger</strong>
        <div className="auth-nav-links" aria-label="Product sections">
          <a href="#workspaces">Workspaces</a>
          <a href="#insights">Insights</a>
          <a href="#archive">Archive</a>
          <a href="#security">Security</a>
        </div>
      </nav>

      <section className="auth-hero">
        <div className="auth-copy">
          <p className="protocol-pill">Consensus system of record</p>
          <h1>Make every decision visible, traceable, and defensible.</h1>
          <p className="auth-lede">
            Decision Ledger turns scattered opinions into structured sessions, live vote telemetry, and an audit-ready record your team can revisit without decoding chat history.
          </p>
          <div className="auth-feature-grid">
            <article>
              <span aria-hidden="true">01</span>
              <h2>Visible paths</h2>
              <p>Map options, votes, winners, and ranked rounds into one readable decision trail.</p>
            </article>
            <article>
              <span aria-hidden="true">02</span>
              <h2>Consensus meters</h2>
              <p>Watch result snapshots update live while every submitted vote stays immutable.</p>
            </article>
          </div>
        </div>

        <div className="auth-card-shell">
          <AuthPanel onAuth={onAuth} onError={onError} />
          <StatusBar notice={notice} error={error} />
        </div>
      </section>

      <section className="trust-strip" aria-label="Decision Ledger platform capabilities">
        <p>Built for accountable product, policy, and leadership decisions</p>
        <div>
          <span>Workspaces</span>
          <span>Ranked IRV</span>
          <span>Live Results</span>
          <span>Audit Trail</span>
        </div>
      </section>

      <footer className="auth-footer">
        <div>
          <h2>Decision Ledger</h2>
          <p>A system of record for the choices that shape teams, products, and organizations.</p>
        </div>
        <div>
          <h3>Platform</h3>
          <p>Workspaces</p>
          <p>Result snapshots</p>
          <p>Decision archive</p>
        </div>
        <div>
          <h3>Trust</h3>
          <p>Traceable votes</p>
          <p>Explainable rounds</p>
          <p>Email-secured access</p>
        </div>
      </footer>
    </div>
  );
}
