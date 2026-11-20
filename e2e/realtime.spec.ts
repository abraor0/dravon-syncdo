// Flow: realtime (two members see the same change without reloading).
import { addCard, card, openCompanyColumn, priorityBadge } from './support/board';
import { insertTasks, withDatabase } from './support/database';
import { MEMBER_1, MEMBER_2, expect, test } from './support/test';
import type { Page } from '@playwright/test';

// Changes made before the watcher's live subscription is joined are never delivered, and the
// page gives no signal for "subscribed". So we prove the feed is live first: keep renaming a
// probe task in the database until the watcher shows the new name.
async function waitUntilLive(watcher: Page, probeTitle: string) {
  let round = 0;
  let current = probeTitle;
  await expect(async () => {
    const next = `${probeTitle} #${++round}`;
    await withDatabase(db => db.query('update public.tasks set title = $1 where title = $2', [next, current]));
    current = next;
    await expect(card(watcher, next)).toBeVisible({ timeout: 1_500 });
  }).toPass({ timeout: 20_000 });
}

test('a teammate\'s new task, its completion and its deletion appear live', async ({ boardAs, prefix }) => {
  const probe = `${prefix} Example probe task`;
  await insertTasks([{ title: probe, assignee: MEMBER_2.email }]);

  // Member 1 watches member 2's column in Company View
  const watcher = await boardAs(MEMBER_1);
  await openCompanyColumn(watcher, MEMBER_2.name);
  await waitUntilLive(watcher, probe);

  const author = await boardAs(MEMBER_2);
  const title = `${prefix} Example task shared live`;

  // Created by member 2
  await addCard(author, title, 'High');
  const seen = card(watcher, title);
  await expect(seen).toBeVisible();
  await expect(seen.getByRole('combobox')).toHaveValue(MEMBER_2.email);
  await expect(priorityBadge(seen)).toHaveText('High');

  // Completed by member 2
  await card(author, title).getByRole('checkbox').click();
  await expect(seen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
  await expect(seen.getByText(`✓ ${MEMBER_2.name}`)).toBeVisible();

  // Deleted by member 2
  await card(author, title).hover();
  await card(author, title).getByRole('button', { name: 'More actions' }).click();
  await author.getByRole('button', { name: 'Delete Task' }).click();
  await expect(card(watcher, title)).toHaveCount(0);
});

test('a change made by one member reaches the other member\'s own board', async ({ boardAs, prefix }) => {
  const probe = `${prefix} Example probe task`;
  await insertTasks([{ title: probe, assignee: MEMBER_2.email }]);
  const receiver = await boardAs(MEMBER_2);
  await waitUntilLive(receiver, probe);

  // Member 1 hands a task over; it lands on member 2's board without a reload
  const sender = await boardAs(MEMBER_1);
  const title = `${prefix} Example task handed over live`;
  await addCard(sender, title);
  await card(sender, title).getByRole('combobox', { name: 'Reassign task' }).selectOption({ label: MEMBER_2.name });

  await expect(card(receiver, title)).toBeVisible();
  await expect(card(receiver, title).getByRole('combobox', { name: 'Reassign task' })).toHaveValue(MEMBER_2.email);
});
