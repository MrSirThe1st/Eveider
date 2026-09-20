import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { dismissCookieBanner, signIn } from './helpers/auth';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const F8 = {
  FLOW1_TRANSIT: 'F8-FLOW1-TRANSIT',
  FLOW2_NEW: 'F8-FLOW2-NEW',
  FLOW1_READY_UNPAID: 'F8-FLOW1-READY-UNPAID',
  FLOW1_READY_PAID: 'F8-FLOW1-READY-PAID',
  ZERO_FEE: 'F8-ZERO-FEE',
  MISSING_CHARGE: 'F8-MISSING-CHARGE',
  AT_POINT_PIN: 'F8-AT-POINT-PIN',
  RETURN_REQUESTED: 'F8-RETURN-REQUESTED',
  RETURN_3A: 'F8-RETURN-3A',
  RETURN_3B: 'F8-RETURN-3B',
  RTS_HISTORICAL: 'F8-RTS-HISTORICAL',
} as const;

async function adminParcel(page: Page, reference: string) {
  const response = await page.request.get(`/api/parcels?search=${reference}`);
  const result = await response.json();
  const parcel = (result.data.parcels as Array<{ id: string; reference: string | null; trackingNumber?: string }>).find(
    (item) => item.reference === reference,
  );
  expect(parcel, `missing ${reference}`).toBeTruthy();
  return parcel!;
}

async function businessParcel(page: Page, reference: string) {
  const response = await page.request.get(`/api/organisation/parcels?search=${reference}`);
  const result = await response.json();
  const parcel = (result.data.parcels as Array<{ id: string; reference: string | null }>).find(
    (item) => item.reference === reference,
  );
  expect(parcel, `missing ${reference}`).toBeTruthy();
  return parcel!;
}

async function track(request: APIRequestContext, trackingNumber: string) {
  const response = await request.post('/api/track', {
    data: { mode: 'tracking', trackingNumber },
  });
  const json = await response.json();
  expect(json.success, json.error ?? 'track failed').toBe(true);
  return json.data.parcel as {
    pickupPin: string | null;
    status: string;
    statusLabel?: string;
    pickupPayment?: { integrityError?: string | null; required?: boolean };
    customerReturn?: { returnCode?: string | null } | null;
  };
}

test.describe('Phase 8 participant E2E', () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeAll(() => {
    execSync('pnpm --filter @eveider/data-access db:seed:phase8', {
      cwd: repoRoot,
      stdio: 'inherit',
    });
  });

  test('Admin sees Flow 1 transport and Flow 2 without Livraison', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    const transit = await adminParcel(page, F8.FLOW1_TRANSIT);
    await page.goto(`/tableau-de-bord/colis/${transit.id}`);
    await dismissCookieBanner(page);
    await expect(page.getByText('Collecte Eveider').first()).toBeVisible();
    await expect(page.getByText('Livraison aller').first()).toBeVisible();

    const created = await adminParcel(page, F8.FLOW2_NEW);
    await page.goto(`/tableau-de-bord/colis/${created.id}`);
    await expect(page.getByText('Dépôt au casier').first()).toBeVisible();
    await expect(page.getByText('Aucun transport Eveider')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assigner l’aller' })).toHaveCount(0);
  });

  test('Admin can assign Flow 3A and sees 3B without transport', async ({ page }) => {
    await signIn(page, 'admin@eveider.cd');
    const parcel3a = await adminParcel(page, F8.RETURN_3A);
    await page.goto(`/tableau-de-bord/colis/${parcel3a.id}`);
    await dismissCookieBanner(page);
    await expect(page.getByText('Retour Eveider').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assigner le retour client' })).toBeVisible();

    const parcel3b = await adminParcel(page, F8.RETURN_3B);
    await page.goto(`/tableau-de-bord/colis/${parcel3b.id}`);
    await expect(page.getByText('Retrait par l’entreprise').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assigner le retour client' })).toHaveCount(0);
  });

  test('Business inspects a requested return without driver assignment', async ({ page }) => {
    await signIn(page, 'boutique.lubum@eveider.cd');
    const parcel = await businessParcel(page, F8.RETURN_REQUESTED);
    await page.goto(`/organisation/tableau-de-bord/colis/${parcel.id}`);
    await dismissCookieBanner(page);
    await expect(page.getByText('Retour client').first()).toBeVisible();
    await expect(page.getByRole('option', { name: 'Retour Eveider' })).toHaveCount(1);
    await expect(page.getByRole('option', { name: 'Retrait par l’entreprise' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Autoriser' })).toBeVisible();
    await expect(page.getByText('Assigner le retour client')).toHaveCount(0);
  });

  test('guest /suivi hides PIN, return code, and missing-charge-as-free', async ({ page, request }) => {
    await signIn(page, 'admin@eveider.cd');
    const unpaidMeta = await adminParcel(page, F8.FLOW1_READY_UNPAID);
    const paidMeta = await adminParcel(page, F8.FLOW1_READY_PAID);
    const zeroMeta = await adminParcel(page, F8.ZERO_FEE);
    const missingMeta = await adminParcel(page, F8.MISSING_CHARGE);
    const atPointMeta = await adminParcel(page, F8.AT_POINT_PIN);
    const rtsMeta = await adminParcel(page, F8.RTS_HISTORICAL);

    const unpaidNumber = unpaidMeta.trackingNumber ?? unpaidMeta.reference!;
    const paidNumber = paidMeta.trackingNumber ?? paidMeta.reference!;
    const zeroNumber = zeroMeta.trackingNumber ?? zeroMeta.reference!;
    const missingNumber = missingMeta.trackingNumber ?? missingMeta.reference!;
    const atPointNumber = atPointMeta.trackingNumber ?? atPointMeta.reference!;
    const rtsNumber = rtsMeta.trackingNumber ?? rtsMeta.reference!;

    const unpaid = await track(request, unpaidNumber);
    expect(unpaid.pickupPin).toBeNull();
    expect(unpaid.customerReturn?.returnCode ?? null).toBeNull();

    const atPoint = await track(request, atPointNumber);
    expect(atPoint.pickupPin).toBeNull();
    expect(atPoint.status).toBe('delivered_to_locker');

    const missing = await track(request, missingNumber);
    expect(missing.pickupPin).toBeNull();
    expect(missing.pickupPayment?.integrityError).toBe('CANONICAL_CHARGE_MISSING');

    const paid = await track(request, paidNumber);
    expect(paid.pickupPin).toMatch(/^\d{6}$/);

    const zero = await track(request, zeroNumber);
    expect(zero.pickupPin).toMatch(/^\d{6}$/);

    const rts = await track(request, rtsNumber);
    expect(rts.status).toBe('returned');
    expect(rts.statusLabel ?? '').toMatch(/expéditeur|Retour/i);

    await page.goto('/suivi');
    await dismissCookieBanner(page);
    await expect(page.getByRole('heading', { name: 'Suivre votre colis' })).toBeVisible();
    await page.locator('input').first().fill(unpaidNumber);
    await page.getByRole('button', { name: 'Suivre mon colis' }).click();
    await expect(page.getByText('811001')).toHaveCount(0);
    await expect(page.getByText('Prêt au retrait').first()).toBeVisible({ timeout: 20_000 });
  });
});
