// Flow: auth (login, wrong password, logout).
// These tests sign in through the login form on purpose, so they don't use boardAs().
import { MEMBER_1, MEMBER_2, expect, test } from './support/test';

const emailField = (page: import('@playwright/test').Page) => page.getByPlaceholder('example@example.com');
const passwordField = (page: import('@playwright/test').Page) => page.getByPlaceholder('enter your password');
const loginButton = (page: import('@playwright/test').Page) => page.getByRole('button', { name: 'Login' });

test('a visitor who is not signed in only gets the login screen', async ({ page }) => {
  await page.goto('/tasks');

  await expect(loginButton(page)).toBeVisible();
  await expect(page.getByText('Restricted Access')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your Tasks' })).toHaveCount(0);
});

test('a wrong password is rejected with a message and no session', async ({ page }) => {
  await page.goto('/');
  await emailField(page).fill(MEMBER_1.email);
  await passwordField(page).fill('not-the-password');
  await loginButton(page).click();

  await expect(page.getByText('Invalid login credentials')).toBeVisible();
  await expect(loginButton(page)).toBeEnabled();

  await page.reload();
  await expect(loginButton(page)).toBeVisible();
});

test('logging in opens your board and the session survives a reload', async ({ page }) => {
  await page.goto('/');
  await emailField(page).fill(MEMBER_2.email);
  await passwordField(page).fill(MEMBER_2.password);
  await loginButton(page).click();

  await expect(page).toHaveURL(/\/tasks$/);
  await expect(page.getByRole('banner').getByText(MEMBER_2.name)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your Tasks' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('banner').getByText(MEMBER_2.name)).toBeVisible();

  // Any other address inside the app leads back to the board
  await page.goto('/reports/2026');
  await expect(page).toHaveURL(/\/tasks$/);
});

test('logging out returns to the login screen for good', async ({ page }) => {
  await page.goto('/');
  await emailField(page).fill(MEMBER_1.email);
  await passwordField(page).fill(MEMBER_1.password);
  await loginButton(page).click();
  await expect(page.getByRole('heading', { name: 'Your Tasks' })).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();

  await expect(loginButton(page)).toBeVisible();
  await page.reload();
  await expect(loginButton(page)).toBeVisible();
  await expect(page.getByRole('banner')).toHaveCount(0);
});
