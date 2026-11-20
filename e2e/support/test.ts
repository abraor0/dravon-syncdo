// Playwright fixtures for the E2E specs. Import `test` and `expect` from here, not from
// @playwright/test.
import { test as base, expect, type Page } from '@playwright/test';
import { createClient, type Session } from '@supabase/supabase-js';
import { deleteTasksStartingWith } from './database';
import { SESSION_STORAGE_KEY, SUPABASE_KEY, SUPABASE_URL } from './local-stack';

export { expect };

// The two members created by supabase/seed.sql (placeholder accounts, local stack only).
export const MEMBER_1 = { email: 'example1@example.com', password: 'password123', name: 'Example User 1' };
export const MEMBER_2 = { email: 'example2@example.com', password: 'password123', name: 'Example User 2' };
export type Member = typeof MEMBER_1;

interface WorkerFixtures {
  // One real sign-in per member for the whole run, through the Supabase auth API.
  sessionOf: (member: Member) => Promise<Session>;
}

interface TestFixtures {
  // A title prefix unique to this test. Every task whose title starts with it is deleted
  // after the test, whether it was created through the UI or directly in the database.
  prefix: string;
  // Opens the task board signed in as a member, in a fresh browser context, and waits until
  // the board has finished loading.
  boardAs: (member: Member) => Promise<Page>;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  sessionOf: [
    async ({}, use) => {
      const sessions = new Map<string, Promise<Session>>();
      const signIn = async (member: Member) => {
        const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await client.auth.signInWithPassword({ email: member.email, password: member.password });
        if (error || !data.session) throw new Error(`Could not sign in ${member.email}: ${error?.message}`);
        return data.session;
      };
      await use(member => {
        if (!sessions.has(member.email)) sessions.set(member.email, signIn(member));
        return sessions.get(member.email)!;
      });
    },
    { scope: 'worker' },
  ],

  prefix: async ({}, use, testInfo) => {
    const prefix = `[e2e ${testInfo.testId.slice(-6)}${Date.now().toString(36).slice(-4)}]`;
    await use(prefix);
    await deleteTasksStartingWith(prefix);
  },

  boardAs: async ({ browser, sessionOf }, use) => {
    const contexts: Awaited<ReturnType<typeof browser.newContext>>[] = [];
    await use(async member => {
      const session = await sessionOf(member);
      const context = await browser.newContext();
      contexts.push(context);
      // Give the app the session supabase-js would have stored after signing in. Only when
      // nothing is stored yet, so the app's own later changes (refresh, sign-out) win.
      await context.addInitScript(([key, value]) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, value);
      }, [SESSION_STORAGE_KEY, JSON.stringify(session)] as const);
      const page = await context.newPage();
      await openBoard(page);
      return page;
    });
    await Promise.all(contexts.map(c => c.close()));
  },
});

// Navigates to the board and waits for it to be ready: the "Your Tasks" column only renders
// once the task list has loaded, so counters and cards are final after this.
export async function openBoard(page: Page) {
  await page.goto('/tasks');
  await expect(page.getByRole('heading', { name: 'Your Tasks' })).toBeVisible();
}

export async function reloadBoard(page: Page) {
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your Tasks' })).toBeVisible();
}
