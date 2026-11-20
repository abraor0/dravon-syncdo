// Flow: filters (status/date filtering and ordering).
//
// Each test inserts its own tasks for Example User 1 straight into the database, with dates
// relative to now, so the results don't depend on the seed or on the day the suite runs.
// The board also shows the seed's tasks; assertions only look at this test's own titles.
import { card, cardTitles, headerCounter, pickPeriod } from './support/board';
import { insertTasks } from './support/database';
import { MEMBER_1, expect, reloadBoard, test } from './support/test';
import type { Page } from '@playwright/test';

async function visibleOf(page: Page, titles: string[]) {
  const shown: string[] = [];
  for (const title of titles) {
    if (await card(page, title).count() > 0) shown.push(title);
  }
  return shown;
}

test.describe('by date and status', () => {
  test('open tasks always show; completed ones only within the chosen period', async ({ boardAs, prefix }) => {
    const OPEN_OLD = `${prefix} Example open task from last year`;
    const DONE_NOW = `${prefix} Example task completed just now`;
    const DONE_3D = `${prefix} Example task completed 3 days ago`;
    const DONE_OLD = `${prefix} Example task completed 400 days ago`;
    const ALL = [OPEN_OLD, DONE_NOW, DONE_3D, DONE_OLD];
    await insertTasks([
      { title: OPEN_OLD, assignee: MEMBER_1.email, createdDaysAgo: 400 },
      { title: DONE_NOW, assignee: MEMBER_1.email, createdDaysAgo: 5, completedDaysAgo: 0 },
      { title: DONE_3D, assignee: MEMBER_1.email, createdDaysAgo: 5, completedDaysAgo: 3 },
      { title: DONE_OLD, assignee: MEMBER_1.email, createdDaysAgo: 410, completedDaysAgo: 400 },
    ]);
    const page = await boardAs(MEMBER_1);

    // Today is selected by default
    await expect(page.getByRole('banner').getByText('Completed Today')).toBeVisible();
    await expect(card(page, DONE_NOW)).toBeVisible();
    expect(await visibleOf(page, ALL)).toEqual([OPEN_OLD, DONE_NOW]);

    await pickPeriod(page, 'Week');
    await expect(card(page, DONE_3D)).toBeVisible();
    expect(await visibleOf(page, ALL)).toEqual([OPEN_OLD, DONE_NOW, DONE_3D]);

    // A calendar month always includes today and never a day 400 days ago
    await pickPeriod(page, 'Month');
    await expect(card(page, DONE_OLD)).toHaveCount(0);
    expect(await visibleOf(page, ALL)).toEqual(expect.arrayContaining([OPEN_OLD, DONE_NOW]));

    await pickPeriod(page, 'All');
    await expect(card(page, DONE_OLD)).toBeVisible();
    expect(await visibleOf(page, ALL)).toEqual(ALL);
  });

  test('the header counter matches the completed and total cards shown in each period', async ({ boardAs, prefix }) => {
    await insertTasks([
      { title: `${prefix} Example open task`, assignee: MEMBER_1.email },
      { title: `${prefix} Example task completed today`, assignee: MEMBER_1.email, completedDaysAgo: 0 },
      { title: `${prefix} Example task completed 400 days ago`, assignee: MEMBER_1.email, createdDaysAgo: 401, completedDaysAgo: 400 },
    ]);
    const page = await boardAs(MEMBER_1);

    for (const period of ['Today', 'Week', 'Month', 'All'] as const) {
      await pickPeriod(page, period);
      const checkboxes = page.getByRole('checkbox');
      const shown = await checkboxes.count();
      const completed = await page.locator('[role="checkbox"][aria-checked="true"]').count();
      expect(await headerCounter(page), `counter for ${period}`).toEqual({ completed, shown });
    }
  });
});

test.describe('ordering', () => {
  // Inserted oldest first: A (3 days, low), B (2 days, high), C (1 day, medium) are open;
  // D (4 days, high) was completed today, so it shows under the default "Today" period too.
  async function arrange(prefix: string) {
    const t = {
      A: `${prefix} A Example task, low`,
      B: `${prefix} B Example task, high`,
      C: `${prefix} C Example task, medium`,
      D: `${prefix} D Example task, high, completed`,
    };
    await insertTasks([
      { title: t.A, assignee: MEMBER_1.email, priority: 'low', createdDaysAgo: 3 },
      { title: t.B, assignee: MEMBER_1.email, priority: 'high', createdDaysAgo: 2 },
      { title: t.C, assignee: MEMBER_1.email, priority: 'medium', createdDaysAgo: 1 },
      { title: t.D, assignee: MEMBER_1.email, priority: 'high', createdDaysAgo: 4, completedDaysAgo: 0 },
    ]);
    return t;
  }

  const sortBy = (page: Page) => page.getByRole('combobox', { name: 'Sort by' });

  test('newest first by default, then oldest first', async ({ boardAs, prefix }) => {
    const t = await arrange(prefix);
    const page = await boardAs(MEMBER_1);

    await expect(sortBy(page)).toHaveValue('date_desc');
    expect(await cardTitles(page, prefix)).toEqual([t.C, t.B, t.A, t.D]);

    await sortBy(page).selectOption('date_asc');
    await expect.poll(() => cardTitles(page, prefix)).toEqual([t.D, t.A, t.B, t.C]);
  });

  test('by priority: high, then medium, then low', async ({ boardAs, prefix }) => {
    const t = await arrange(prefix);
    const page = await boardAs(MEMBER_1);

    await sortBy(page).selectOption('priority');

    // Ties keep the newest-first order the tasks arrive in
    await expect.poll(() => cardTitles(page, prefix)).toEqual([t.B, t.D, t.C, t.A]);
  });

  test('by status: completed first, then open', async ({ boardAs, prefix }) => {
    const t = await arrange(prefix);
    const page = await boardAs(MEMBER_1);

    await sortBy(page).selectOption('status');

    await expect.poll(() => cardTitles(page, prefix)).toEqual([t.D, t.C, t.B, t.A]);
  });

  test('the chosen order is remembered after a reload', async ({ boardAs, prefix }) => {
    const t = await arrange(prefix);
    const page = await boardAs(MEMBER_1);
    await sortBy(page).selectOption('date_asc');

    await reloadBoard(page);

    await expect(sortBy(page)).toHaveValue('date_asc');
    expect(await cardTitles(page, prefix)).toEqual([t.D, t.A, t.B, t.C]);
  });
});
