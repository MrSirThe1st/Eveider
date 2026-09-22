import { expect, type Page } from '@playwright/test';

export function uniqueGeoCode(prefix: string) {
  const suffix = Date.now().toString(36).slice(-4).toUpperCase();
  return `${prefix}${suffix}`.slice(0, 12);
}

/** Pick a catalog city (or reuse it if already operating). Admin never types a city name. */
export async function ensureOperatingCity(page: Page, name: string, province: string) {
  const heading = page.getByRole('heading', { name, exact: true });
  if ((await heading.count()) > 0) {
    return page.locator('section').filter({ has: heading.first() });
  }

  await page.getByRole('button', { name: 'Nouvelle ville' }).click();
  await expect(page.getByRole('heading', { name: 'Nouvelle ville' })).toBeVisible();
  await expect(page.getByLabel('Code', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Créer la ville' })).toBeDisabled();

  await page.getByLabel('Ville').selectOption({ label: name });
  await expect(page.getByText(`Province : ${province}`)).toBeVisible();
  await page.getByRole('button', { name: 'Créer la ville' }).click();
  await expect(page.getByText(`Ville ${name} créée.`)).toBeVisible();
  return page.locator('section').filter({ has: page.getByRole('heading', { name, exact: true }) });
}
