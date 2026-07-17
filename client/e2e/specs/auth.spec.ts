import { test, expect } from '@playwright/test';

const MOCK_USER = { id: 1, username: 'testuser', role: 'cr', display_name: 'Test User' };
const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsInJvbGUiOiJjciIsImV4cCI6OTk5OTk5OTk5OX0.fakesig';

async function mockApi(page) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/login')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: MOCK_TOKEN, user: MOCK_USER }) });
    } else if (url.includes('/auth/me')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: MOCK_USER }) });
    } else if (url.includes('/announcements')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ announcements: [], pagination: { page: 1, limit: 20, total: 0 } }) });
    } else if (url.includes('/courses')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    } else if (url.includes('/platforms')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    } else if (url.includes('/templates')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    } else if (url.includes('/files')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ usage: 0, limit: 1073741824 }) });
    } else if (url.includes('/ws-available')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ available: false }) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    }
  });
}

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test('shows login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Welcome back')).toBeVisible();
    await expect(page.getByLabel(/username/i)).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('shows validation errors on empty login', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#password').waitFor({ state: 'attached' });
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/please fill in all fields/i)).toBeVisible({ timeout: 3000 });
  });

  test('redirects to dashboard after login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/username/i).fill('testuser');
    await page.locator('#password').fill('testpass');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });
});
