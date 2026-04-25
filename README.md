# Decision Engine Web

Frontend client for the real-time decision platform.

## License Status

This repository is source-available for viewing and evaluation only.
All rights are reserved by the author. No permission is granted to use,
modify, redistribute, or commercialize this code without prior written
permission. See [LICENSE](LICENSE).

This repository owns the user-facing workspace, session, voting, and result views. It consumes the API and subscribes to Mercure topics for live result updates.

## Code Map

- `src/app`: shell composition, controllers, and top-level orchestration.
- `src/api/mappers.ts`: normalization layer for backend payloads before they enter app state.
- `src/auth`: login and registration screens.
- `src/workspace`: workspace header, rail, and settings surfaces.
- `src/workspace/workspaceDomain.ts`: workspace summaries and preferred-selection policy.
- `src/sessions`: board, session detail, draft editing, and voting flows.
- `src/sessions/sessionDomain.ts`: session-specific invariants and vote payload rules.
- `src/results`: live and final result presentation.
- `src/shared`: reusable UI primitives and shared hooks.
- `src/styles`: global shell and baseline styling.

## Responsibilities

- Authentication screens.
- Workspace navigation.
- Decision session creation.
- Option editing while a session is in draft.
- Vote casting.
- Live result display.
- Ranked IRV round explanation.
- Closed-session final result display.

## Expected Integration

- REST API for commands and reads.
- Mercure `EventSource` subscriptions for result update notifications.
- JWT-based authenticated requests.

## Local Development

```bash
npm install
npm run dev
```

The Vite dev server proxies `/api` to `http://127.0.0.1:8000`. Configure these values with:

```text
VITE_API_BASE_URL=/api
VITE_MERCURE_URL=http://127.0.0.1:3001/.well-known/mercure
```

## UI Behavior Notes

- Modal keyboard handling is centralized in `src/shared/useDialogFocusTrap.ts`.
- Workspace activation refreshes sessions, dashboard state, and members together from `src/App.tsx`.
- Session search, board navigation, and result updates are treated as app-shell concerns rather than page-local state.

## Implemented MVP Flow

- Register and login.
- Persist auth state in `localStorage`.
- List and create workspaces.
- Add registered workspace members by email.
- List, create, open, and close decision sessions.
- Add options while a session is in draft.
- Cast majority and ranked IRV votes.
- Read result snapshots and refetch after Mercure `result_updated` events.

## Verification

```bash
npm run build
npm test
```

Additional implementation notes live in [docs/repo-improvement-log.md](docs/repo-improvement-log.md).
