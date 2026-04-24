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
  const searchResultsId = 'vote-search-results';
  const searchOpen = normalizedSearchQuery.length > 0;

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
            aria-autocomplete="list"
            aria-controls={searchResultsId}
            aria-expanded={searchOpen}
            placeholder="Search votes..."
            type="text"
            value={searchQuery}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && searchOpen) {
                onSearchChange('');
              }
            }}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {searchOpen ? (
            <ul className="search-results" aria-label="Vote search results" id={searchResultsId}>
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
      <div className="oracle-actions">
        <p className="topbar-context">Search decisions, drafts, and assignees</p>
        <div className="profile-chip" aria-label={`Signed in as ${auth.user.display_name}`}>
          {auth.user.display_name.slice(0, 1).toUpperCase()}
        </div>
        <button className="ghost-button" type="button" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </header>
  );
}
