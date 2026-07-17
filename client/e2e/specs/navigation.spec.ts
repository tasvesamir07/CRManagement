import { test, expect } from '@playwright/test';

const MOCK_USER = { id: 1, username: 'testuser', role: 'cr', display_name: 'Test User' };
const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsInJvbGUiOiJjciIsImV4cCI6OTk5OTk5OTk5OX0.fakesig';

function seedAuthScript() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsInJvbGUiOiJjciIsImV4cCI6OTk5OTk5OTk5OX0.fakesig';
  const user = '{"id":1,"username":"testuser","role":"cr","display_name":"Test User"}';
  localStorage.setItem('cr_token', token);
  localStorage.setItem('cr_user', user);
}

async function mockApi(page) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/login')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: MOCK_TOKEN, user: MOCK_USER }) });
    } else if (url.includes('/auth/me')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: MOCK_USER }) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    }
  });
}

test.describe('Dashboard Navigation', () => {
  test('all main sidebar navigation links are visible', async ({ page }) => {
    await mockApi(page);
    await page.goto('/login');
    await page.getByLabel(/username/i).fill('testuser');
    await page.locator('#password').fill('testpass');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    const links = [/overview/i, /courses/i, /files/i, /logs/i, /profile/i];
    for (const link of links) {
      await expect(page.getByRole('link', { name: link })).toBeVisible();
    }
  });

  test('navigates through all main pages', async ({ page }) => {
    await mockApi(page);
    await page.addInitScript(seedAuthScript);
    const routes = ['/courses', '/platforms', '/files', '/logs', '/profile'];
    for (const path of routes) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(path.replace('/', '\\/')));
    }
  });
});
