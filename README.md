# Decision Engine Web

Frontend client for the real-time decision platform.

## License Status

This repository is source-available for viewing and evaluation only.
All rights are reserved by the author. No permission is granted to use,
modify, redistribute, or commercialize this code without prior written
permission. See [LICENSE](LICENSE).

This repository owns the user-facing workspace, session, voting, and result views. It consumes the API and subscribes to Mercure topics for live result updates.

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
