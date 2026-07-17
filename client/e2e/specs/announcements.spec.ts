import { test, expect } from '@playwright/test';

function seedAuthScript() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsInJvbGUiOiJjciIsImV4cCI6OTk5OTk5OTk5OX0.fakesig';
  const user = '{"id":1,"username":"testuser","role":"cr","display_name":"Test User"}';
  localStorage.setItem('cr_token', token);
  localStorage.setItem('cr_user', user);
}

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

test.describe('Announcements', () => {
  test('shows announcement form with all required fields', async ({ page }) => {
    await mockApi(page);
    await page.addInitScript(seedAuthScript);
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: 'Overview', exact: true })).toBeVisible();
    const link = page.getByRole('link', { name: 'New Broadcast' });
    await expect(link).toBeVisible({ timeout: 5000 });
    await link.click();
    await expect(page).toHaveURL(/\/announcement\/new/);
    await expect(page.getByRole('heading', { name: /new broadcast/i })).toBeVisible({ timeout: 8000 });
  });

  test('sidebar has create announcement link', async ({ page }) => {
    await mockApi(page);
    await page.goto('/login');
    await page.getByLabel(/username/i).fill('testuser');
    await page.locator('#password').fill('testpass');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    const link = page.getByRole('link', { name: 'New Broadcast' });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/announcement\/new/);
  });
});
