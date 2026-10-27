import { expect, Page, test } from '@playwright/test';

const PERMISSIONS = [
  'Dashboard_View',
  'Member_Read',
  'Member_Create',
  'Finance_Read',
  'Finance_Offering_Read',
  'Finance_Offering_Create',
  'Event_Read',
  'User_Read',
  'Role_Manage',
  'Audit_Read',
];

function base64Url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function createJwt(payload: Record<string, unknown>, lifetimeSeconds = 3600): string {
  const exp = Math.floor(Date.now() / 1000) + lifetimeSeconds;
  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url({ ...payload, exp })}.signature`;
}

const USER = {
  id: 'e2e-miav',
  username: 'e2e.miav@eglise.test',
  email: 'e2e.miav@eglise.test',
  firstName: 'E2E',
  lastName: 'MIAV',
  fullName: 'E2E MIAV',
  phone: '+22500000000',
  isActive: true,
  roles: ['SUPER_ADMIN'],
  permissions: PERMISSIONS,
};

async function installApiMocks(page: Page): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.toLowerCase();

    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        },
      });
      return;
    }

    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(body),
      });

    if (path.endsWith('/api/v1/auth/login')) {
      await json({
        token: createJwt({ id: USER.id, role: 'SUPER_ADMIN', Permission: PERMISSIONS }),
        refreshToken: 'refresh-lot1',
      });
      return;
    }

    if (path.endsWith('/api/v1/auth/me')) {
      await json(USER);
      return;
    }

    if (path.includes('/user')) {
      await json({
        success: true,
        message: '',
        data: {
          items: [],
          totalCount: 0,
          currentPage: 1,
          totalPages: 0,
          pageSize: 20,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      });
      return;
    }

    await json({ success: true, message: '', data: [], items: [], totalCount: 0 });
  });
}

test.describe('Lot 1 — connexion statique et PWA MIAV', () => {
  test('connexion mobile, session conservée et menu utilisable', async ({ page }) => {
    await installApiMocks(page);
    await page.goto('/');

    await expect(page.locator('#miav-static-login')).toBeVisible();
    await expect(page.locator('#msl-email')).toHaveAttribute('autocomplete', 'username');
    await expect(page.locator('#msl-password')).toHaveAttribute('autocomplete', 'current-password');

    await page.locator('#msl-email').fill(USER.email);
    await page.locator('#msl-password').fill('Password123!');
    await page.locator('#msl-submit').click();

    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto('/dashboard/admin/users');
    await expect(page.locator('#sidebar')).toBeAttached();

    const menuButton = page.locator('.menu-toggle-btn').first();
    await expect(menuButton).toBeVisible();

    const isMobile = (page.viewportSize()?.width ?? 390) <= 900;
    if (isMobile) {
      for (let index = 0; index < 20; index++) {
        await menuButton.click();
        await expect(page.locator('#sidebar')).toHaveClass(/open/);
        await page.keyboard.press('Escape');
        await expect(page.locator('#sidebar')).not.toHaveClass(/open/);
      }
    } else {
      await expect(page.locator('#sidebar')).toBeVisible();
    }

    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('ekklesia_auth_data') || '{}')
    );
    expect(stored.token).toBeTruthy();

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('.menu-toggle-btn').first()).toBeVisible();
  });

  test('connexion desktop sans débordement horizontal', async ({ page }) => {
    await installApiMocks(page);
    await page.goto('/');

    const card = page.locator('.msl-card');
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(440);

    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    );
    expect(fits).toBe(true);
  });
});

test.describe('Lot 1 — PWA MIAV', () => {
  test.use({ serviceWorkers: 'allow' });

  test('PWA installable : manifest, icônes et service worker', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Installabilité vérifiée sur Chromium (Chrome Android).');

    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);

    const manifest = await page.evaluate(async () => {
      const response = await fetch('manifest.webmanifest');
      return response.json();
    });

    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.icons.some((icon: { sizes: string }) => icon.sizes === '192x192')).toBe(true);
    expect(manifest.icons.some((icon: { sizes: string }) => icon.sizes === '512x512')).toBe(true);

    const cdp = await page.context().newCDPSession(page);
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
    expect(installabilityErrors).toEqual([]);
  });
});
