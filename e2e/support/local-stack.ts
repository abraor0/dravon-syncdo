// Where the local Supabase stack lives, read from the same .env.local the app uses.
import { loadEnv } from 'vite';

const env = { ...loadEnv('development', process.cwd(), ['YOUR_', 'E2E_']), ...process.env };

export const SUPABASE_URL = env.YOUR_SUPABASE_URL ?? '';
export const SUPABASE_KEY = env.YOUR_SUPABASE_ANON_KEY ?? '';

// Direct connection to the local Postgres (default port and credentials of `supabase start`),
// used only to arrange and clean up test data. Override with E2E_DATABASE_URL if needed.
export const DATABASE_URL = env.E2E_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

export function assertLocal(): void {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('YOUR_SUPABASE_URL / YOUR_SUPABASE_ANON_KEY are not set. Copy .env.example to .env.local (see README).');
  }
  for (const [name, value] of [['YOUR_SUPABASE_URL', SUPABASE_URL], ['E2E_DATABASE_URL', DATABASE_URL]]) {
    if (!LOCAL_HOSTS.has(new URL(value).hostname)) {
      throw new Error(`E2E tests write to the database and only run against a local stack, but ${name} is ${value}.`);
    }
  }
}

// The key supabase-js uses to keep the session in localStorage ("sb-127-auth-token" locally).
export const SESSION_STORAGE_KEY = `sb-${new URL(SUPABASE_URL || 'http://localhost').hostname.split('.')[0]}-auth-token`;
