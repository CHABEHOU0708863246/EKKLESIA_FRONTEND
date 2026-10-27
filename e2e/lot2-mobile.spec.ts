import { expect, Page, test } from '@playwright/test';

const PERMISSIONS = ['Dashboard_View', 'Member_Read', 'Member_Create', 'Finance_Budget_Read'];

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

const MEMBER = {
  id: 'm1',
  firstName: 'Jean',
  lastName: 'Dupont',
  fullName: 'Jean Dupont',
  phone: '+225 0700000000',
  email: 'jean.dupont@eglise.test',
  status: 'Active',
  spiritualStatus: 'Baptized',
  cellGroupId: 'c1',
  cellGroupName: 'Cellule Bethel',
  ministryIds: [],
  ministryNames: [],
  spiritualGifts: [],
  attachments: [],
  churchId: 'ch1',
};

async function installMemberMocks(page: Page): Promise<void> {
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

    const json = (body: unknown) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(body),
      });

    if (path.endsWith('/api/v1/auth/login')) {
      await json({
        token: createJwt({ id: USER.id, role: 'SUPER_ADMIN', Permission: PERMISSIONS }),
        refreshToken: 'refresh-lot2',
      });
      return;
    }

    if (path.endsWith('/api/v1/auth/me')) {
      await json(USER);
      return;
    }

    if (path.endsWith('/api/v1/member/cell-group')) {
      await json([{ id: 'c1', name: 'Cellule Bethel' }]);
      return;
    }

    if (path.endsWith('/api/v1/member')) {
      await json({
        success: true,
        data: null,
        items: [MEMBER],
        totalCount: 1,
        currentPage: 1,
        totalPages: 1,
        pageSize: 25,
        hasPreviousPage: false,
        hasNextPage: false,
      });
      return;
    }

    await json({ success: true, message: '', data: [], items: [], totalCount: 0 });
  });
}

async function loginAndOpenMembers(page: Page): Promise<void> {
  await installMemberMocks(page);
  await page.goto('/');
  await page.fill('#msl-email', 'e2e.miav@eglise.test');
  await page.fill('#msl-password', 'mot-de-passe-e2e');
  await page.click('#msl-submit');
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto('/dashboard/membres');
  await expect(page.locator('table.ml-table')).toBeAttached();
  await expect(page.locator('table.ml-table tbody tr')).toHaveCount(1);
}

test.describe('Lot 2 — tableaux transactionnels en cartes sur mobile', () => {
  test('la liste des membres devient une carte lisible sans débordement', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) > 768, 'Comportement mobile uniquement');
    await loginAndOpenMembers(page);

    const table = page.locator('table.ml-table');
    const row = page.locator('table.ml-table tbody tr').first();
    const firstCell = row.locator('td').first();

    await expect(table).toHaveCSS('display', 'block');
    await expect(page.locator('table.ml-table thead')).toHaveCSS('display', 'none');
    await expect(row).toHaveCSS('display', 'block');
    await expect(firstCell).toHaveCSS('display', 'flex');
    await expect(firstCell).toHaveAttribute('data-label', 'Membre');

    const label = await firstCell.evaluate(
      (element) => getComputedStyle(element, '::before').content
    );
    expect(label).toContain('Membre');

    const actions = row.locator('td[data-label="Actions"]');
    await expect(actions).toHaveCSS('display', 'flex');
    expect(
      await actions.evaluate((element) => getComputedStyle(element, '::before').display)
    ).toBe('none');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('les filtres s’ouvrent dans une feuille inférieure sur mobile', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) > 900, 'Comportement mobile uniquement');
    await loginAndOpenMembers(page);

    const trigger = page.getByRole('button', { name: 'Filtres des membres' });
    const sheet = page.locator('.mfs-sheet');

    await expect(trigger).toBeVisible();
    await expect(sheet).toBeHidden();

    await trigger.click();
    await expect(sheet).toBeVisible();
    await expect(page.locator('body')).toHaveClass(/iam-filter-sheet-open/);
    await expect(sheet.locator('.ml-filters-grid')).toBeVisible();

    await page.locator('.mfs-apply').click();
    await expect(sheet).toBeHidden();
    await expect(page.locator('body')).not.toHaveClass(/iam-filter-sheet-open/);
  });

  test('le tableau garde sa présentation tabulaire sur ordinateur', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) <= 768, 'Comportement desktop uniquement');
    await loginAndOpenMembers(page);

    await expect(page.locator('table.ml-table')).toHaveCSS('display', 'table');
    await expect(page.locator('table.ml-table thead')).toHaveCSS('display', 'table-header-group');
  });

  test('le formulaire membre tient dans l’écran mobile et évite le zoom iOS', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) > 768, 'Comportement mobile uniquement');
    await installMemberMocks(page);
    await page.goto('/');
    await page.fill('#msl-email', 'e2e.miav@eglise.test');
    await page.fill('#msl-password', 'mot-de-passe-e2e');
    await page.click('#msl-submit');
    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto('/dashboard/membres/new');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const input = page.locator('input[type="text"]').first();
    if (await input.count()) {
      await expect(input).toHaveCSS('font-size', '16px');
    }
  });

  test('les filtres financiers restent en ligne sur ordinateur et passent en feuille sur mobile', async ({ page }) => {
    await installMemberMocks(page);
    await page.goto('/');
    await page.fill('#msl-email', 'e2e.miav@eglise.test');
    await page.fill('#msl-password', 'mot-de-passe-e2e');
    await page.click('#msl-submit');
    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto('/dashboard/finances/budget');

    const trigger = page.getByRole('button', { name: 'Filtres' });
    const filters = page.locator('.bl-filter-group');

    if ((page.viewportSize()?.width ?? 0) <= 900) {
      await expect(trigger).toBeVisible();
      await expect(filters).toBeHidden();
      await trigger.click();
      await expect(filters).toBeVisible();
      await page.locator('.mfs-close').click();
      await expect(filters).toBeHidden();
    } else {
      await expect(trigger).toBeHidden();
      await expect(filters).toBeVisible();
    }
  });
});
