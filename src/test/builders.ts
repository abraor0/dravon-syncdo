// Small data builders shared by the unit tests. All values are made-up placeholders.
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import type { Task } from '../features/tasks/services/tasks.api';
import type { AppUser } from '../services/users.api';

export const USER_A: AppUser = { email: 'example1@example.com', name: 'Example User 1' };
export const USER_B: AppUser = { email: 'example2@example.com', name: 'Example User 2' };

let nextId = 1;

export function aTask(overrides: Partial<Task> = {}): Task {
  const id = nextId++;
  return {
    id,
    title: `Example task ${id}`,
    description: null,
    status: 'pending',
    priority: 'medium',
    assignee: USER_A.email,
    created_at: '2026-06-01T09:00:00.000Z',
    completed_at: null,
    completed_by: null,
    ...overrides,
  };
}

export function aCompletedTask(completedAt: string, overrides: Partial<Task> = {}): Task {
  return aTask({ status: 'completed', completed_at: completedAt, completed_by: USER_A.email, ...overrides });
}

export function aSession(email = USER_A.email, metadata: Record<string, unknown> = { name: USER_A.name }): Session {
  return {
    access_token: 'unit-test-access-token',
    refresh_token: 'unit-test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: '00000000-0000-0000-0000-00000000000a',
      email,
      user_metadata: metadata,
      app_metadata: {},
      aud: 'authenticated',
      created_at: '2026-01-01T00:00:00.000Z',
    },
  } as Session;
}

// A fresh React Query client per test, with retries off so failures surface immediately.
export function queryWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return { client, wrapper };
}
