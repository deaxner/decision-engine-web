import type { RefObject } from 'react';
import type { AuthState, DecisionSession } from '../types';

export function AppTopbar({
  auth,
  railCollapsed,
  searchRef,
  searchQuery,
  normalizedSearchQuery,
  searchResults,
  onToggleRail,
  onSearchChange,
  onSelectSession,
  onSignOut,
}: {
  auth: AuthState;
  railCollapsed: boolean;
  searchRef: RefObject<HTMLDivElement | null>;
  searchQuery: string;
  normalizedSearchQuery: string;
  searchResults: DecisionSession[];
  onToggleRail: () => void;
  onSearchChange: (query: string) => void;
  onSelectSession: (session: DecisionSession) => void;
  onSignOut: () => void;
}) {
  return (
    <header className="oracle-topbar">
      <div className="oracle-brand">
        <button
          className="icon-button rail-toggle"
          aria-label={railCollapsed ? 'Expand workspace rail' : 'Collapse workspace rail'}
          onClick={onToggleRail}
          type="button"
        >
          {railCollapsed ? '>' : '<'}
        </button>
        <strong>Decision Ledger</strong>
        <div className="oracle-search" ref={searchRef}>
          <input
            aria-label="Search votes"
            placeholder="Search votes..."
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {normalizedSearchQuery ? (
            <ul className="search-results" aria-label="Vote search results">
              {searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <li key={item.id}>
                    <button className="search-result-button" type="button" onClick={() => onSelectSession(item)}>
                      <span className="search-result-copy">
                        <strong>{item.title}</strong>
                        <small>{item.description || 'No summary provided yet.'}</small>
                      </span>
                      <small className={`search-result-status search-result-status-${item.status.toLowerCase()}`}>{item.status}</small>
                    </button>
                  </li>
                ))
              ) : (
                <li className="search-results-empty">No matching votes.</li>
              )}
            </ul>
          ) : null}
        </div>
      </div>
      <nav className="oracle-nav" aria-label="Primary">
        <a href="#workspaces" className="active">
          Workspaces
        </a>
        <a href="#insights">Insights</a>
        <a href="#archive">Archive</a>
        <a href="#settings">Settings</a>
      </nav>
      <div className="oracle-actions">
        <button className="icon-button" aria-label="Notifications" type="button">
          N
        </button>
        <button className="icon-button" aria-label="Help" type="button">
          ?
        </button>
        <div className="profile-chip" aria-label={`Signed in as ${auth.user.display_name}`}>
          {auth.user.display_name.slice(0, 1).toUpperCase()}
        </div>
        <button className="ghost-button" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </header>
  );
}
