# Decision Engine Web

Frontend client for the real-time decision platform.

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

