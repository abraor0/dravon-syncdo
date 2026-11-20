// Ways to find things on the task board, by what a user sees.
import { expect, type Locator, type Page } from '@playwright/test';

// A task card, by its exact title. The card is the innermost element that contains both the
// title heading and a checkbox; its ancestors (the column, the page) contain them too and
// come first in document order, so the last match is the card itself.
export function card(page: Page, title: string): Locator {
  return page.locator('div')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) })
    .filter({ has: page.getByRole('checkbox') })
    .last();
}

// The priority badge of a card. The owner's card also has a hidden <select> over the badge
// whose options carry the same words, so match the badge element only.
export function priorityBadge(cardLocator: Locator): Locator {
  return cardLocator.locator('span').filter({ hasText: /^(High|Medium|Low)$/ });
}

// Titles of the cards on screen that start with the given prefix, top to bottom.
export async function cardTitles(page: Page, prefix: string): Promise<string[]> {
  const titles = await page.getByRole('heading', { level: 3 }).allTextContents();
  return titles.filter(t => t.startsWith(prefix));
}

// The header counter: "<completed in period> / <tasks shown>".
export async function headerCounter(page: Page): Promise<{ completed: number; shown: number }> {
  const value = page.getByRole('banner').getByText(/^Completed/).locator('xpath=following-sibling::p[1]');
  const [completed, shown] = (await value.innerText()).split('/').map(part => Number(part.trim()));
  return { completed, shown };
}

export async function pickPeriod(page: Page, period: 'Today' | 'Week' | 'Month' | 'All') {
  await page.getByRole('button', { name: period, exact: true }).click();
  const label = { Today: 'Completed Today', Week: 'Completed This Week', Month: 'Completed This Month', All: 'Completed (Total)' }[period];
  await expect(page.getByRole('banner').getByText(label)).toBeVisible();
}

// Creates a task in your own column with the inline creator.
export async function addCard(page: Page, title: string, priority?: 'High' | 'Medium' | 'Low') {
  await page.getByRole('button', { name: 'Add a card' }).click();
  if (priority) {
    await page.getByRole('button', { name: 'Medium', exact: true }).click();
    await page.getByRole('button', { name: priority, exact: true }).click();
  }
  await page.getByPlaceholder('Enter a title for this card...').fill(title);
  await page.keyboard.press('Enter');
  await expect(card(page, title)).toBeVisible();
  await page.keyboard.press('Escape');
}

// Adds a teammate's column in Company View. Every boardAs() page starts from a fresh browser
// context, so the column is never there already.
export async function openCompanyColumn(page: Page, memberName: string) {
  await page.getByRole('button', { name: 'Company View' }).click();
  await page.getByRole('combobox').filter({ hasText: '+ Add User' }).selectOption({ label: memberName });
  await expect(page.getByRole('heading', { name: memberName, exact: true })).toBeVisible();
}
