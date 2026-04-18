import type { AuthState } from './types';

const KEY = 'decision-engine-auth';

export function loadAuth(): AuthState | null {
  const raw = window.localStorage.getItem(KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    window.localStorage.removeItem(KEY);
    return null;
  }
}

export function saveAuth(auth: AuthState): void {
  window.localStorage.setItem(KEY, JSON.stringify(auth));
}

export function clearAuth(): void {
  window.localStorage.removeItem(KEY);
}
