// Flow: tasks (create, edit, finish, delete, assign). Each step is checked on screen, after a
// reload, and in the database row itself.
import { addCard, card, headerCounter, priorityBadge } from './support/board';
import { findTask } from './support/database';
import { MEMBER_1, MEMBER_2, expect, reloadBoard, test } from './support/test';

test.describe('create', () => {
  test('with "Add a card", choosing a priority', async ({ boardAs, prefix }) => {
    const page = await boardAs(MEMBER_1);
    const title = `${prefix} Example task added inline`;

    await addCard(page, title, 'High');

    await expect(priorityBadge(card(page, title))).toHaveText('High');
    await reloadBoard(page);
    await expect(priorityBadge(card(page, title))).toHaveText('High');
    expect(await findTask(title)).toMatchObject({
      assignee: MEMBER_1.email, status: 'pending', priority: 'high', completed_at: null, completed_by: null,
    });
  });

  test('with the "New Task" button, which opens your creator ready to type', async ({ boardAs, prefix }) => {
    const page = await boardAs(MEMBER_1);
    const title = `${prefix} Example task from the button`;

    await page.getByRole('button', { name: 'New Task' }).click();
    const input = page.getByPlaceholder('Enter a title for this card...');
    await expect(input).toBeFocused();
    await page.keyboard.type(title);
    await page.keyboard.press('Enter');

    await expect(card(page, title)).toBeVisible();
    await reloadBoard(page);
    await expect(priorityBadge(card(page, title))).toHaveText('Medium');
  });
});

test('edit the title, description and priority', async ({ boardAs, prefix }) => {
  const page = await boardAs(MEMBER_1);
  const title = `${prefix} Example task to edit`;
  const renamed = `${prefix} Example task, renamed`;
  await addCard(page, title);

  await page.getByRole('heading', { name: title }).click();
  await page.getByRole('textbox').fill(renamed);
  await page.keyboard.press('Enter');
  await expect(card(page, renamed)).toBeVisible();

  await card(page, renamed).getByText('+ Add description').click();
  await page.getByPlaceholder('Describe the details...').fill('Example description written in the browser');
  await page.getByRole('heading', { name: 'Overview' }).click(); // leave the field to save it

  await card(page, renamed).getByRole('combobox', { name: 'Change priority' }).selectOption('low');
  await expect(priorityBadge(card(page, renamed))).toHaveText('Low');

  await reloadBoard(page);
  await expect(card(page, renamed).getByText('Example description written in the browser')).toBeVisible();
  await expect(priorityBadge(card(page, renamed))).toHaveText('Low');
  await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
  expect(await findTask(renamed)).toMatchObject({ description: 'Example description written in the browser', priority: 'low' });
});

test('finish a task, then reopen it', async ({ boardAs, prefix }) => {
  const page = await boardAs(MEMBER_1);
  const title = `${prefix} Example task to finish`;
  await addCard(page, title);
  const before = await headerCounter(page);

  await card(page, title).getByRole('checkbox').click();

  await expect(card(page, title).getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
  await expect(card(page, title).getByText(`✓ ${MEMBER_1.name}`)).toBeVisible();
  await expect.poll(() => headerCounter(page)).toEqual({ completed: before.completed + 1, shown: before.shown });

  await reloadBoard(page);
  await expect(card(page, title).getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
  const finished = await findTask(title);
  expect(finished).toMatchObject({ status: 'completed', completed_by: MEMBER_1.email });
  // Stamped by the server a moment ago, not by the browser
  expect(Date.now() - finished!.completed_at!.getTime()).toBeLessThan(60_000);

  await card(page, title).getByRole('checkbox').click();
  await expect(card(page, title).getByRole('checkbox')).toHaveAttribute('aria-checked', 'false');
  await expect(card(page, title).getByText(/^✓/)).toHaveCount(0);
  await reloadBoard(page);
  await expect(card(page, title).getByRole('checkbox')).toHaveAttribute('aria-checked', 'false');
  expect(await findTask(title)).toMatchObject({ status: 'pending', completed_at: null, completed_by: null });
});

test('delete a task from its actions menu', async ({ boardAs, prefix }) => {
  const page = await boardAs(MEMBER_1);
  const title = `${prefix} Example task to delete`;
  await addCard(page, title);

  await card(page, title).hover();
  await card(page, title).getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('button', { name: 'Delete Task' }).click();

  await expect(card(page, title)).toHaveCount(0);
  await reloadBoard(page);
  await expect(card(page, title)).toHaveCount(0);
  expect(await findTask(title)).toBeUndefined();
});

test('assign a task to another member, who then owns it', async ({ boardAs, prefix }) => {
  const mine = await boardAs(MEMBER_1);
  const title = `${prefix} Example task to hand over`;
  await addCard(mine, title);

  await card(mine, title).getByRole('combobox', { name: 'Reassign task' }).selectOption({ label: MEMBER_2.name });

  // It leaves My Tasks for good
  await expect(card(mine, title)).toHaveCount(0);
  await reloadBoard(mine);
  await expect(card(mine, title)).toHaveCount(0);
  await expect.poll(async () => (await findTask(title))?.assignee).toBe(MEMBER_2.email);

  // The new assignee finds it on their own board and can edit it
  const theirs = await boardAs(MEMBER_2);
  const edited = `${title} (edited by member 2)`;
  await theirs.getByRole('heading', { name: title, exact: true }).click();
  await theirs.getByRole('textbox').fill(edited);
  await theirs.keyboard.press('Enter');
  await expect(card(theirs, edited)).toBeVisible();
  await expect.poll(async () => (await findTask(edited))?.assignee).toBe(MEMBER_2.email);
});
