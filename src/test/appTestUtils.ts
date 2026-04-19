import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import type { Workspace } from '../types';

export const auth = {
  user: { id: '1', email: 'owner@example.test', display_name: 'Owner' },
  token: 'token-1',
};

export const workspace: Workspace = {
  id: '10',
  name: 'Product',
  slug: 'product',
  role: 'OWNER',
};

export const optionA = { id: '100', title: 'A', position: 1 };
export const optionB = { id: '101', title: 'B', position: 2 };

export class MockEventSource extends EventTarget {
  static instances: MockEventSource[] = [];
  url: string;

  constructor(url: string) {
    super();
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close = vi.fn();
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

export function seedAuth() {
  window.localStorage.setItem('decision-engine-auth', JSON.stringify(auth));
}

export function installAppTestHooks() {
  beforeEach(() => {
    window.localStorage.clear();
    MockEventSource.instances = [];
    vi.stubGlobal('EventSource', MockEventSource);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
}
