import { expect, type Page } from '../../server/test';

/** The picker displays VN calendar days even when the browser's local timezone differs. */
export async function auditDayRange(page: Page) {
  const day = new Date(Date.now() - 2 * 86_400_000).toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Ho_Chi_Minh',
  });
  await page.getByPlaceholder('Từ ngày', { exact: true }).fill(day);
  await page.getByPlaceholder('Từ ngày', { exact: true }).press('Tab');
  await page.getByPlaceholder('Đến ngày', { exact: true }).fill(day);
  const ranged = page.waitForResponse((r) => {
    const u = new URL(r.url());
    return u.pathname === '/v1/admin/audit-logs' && u.searchParams.has('from') && r.ok();
  });
  await page.getByPlaceholder('Đến ngày', { exact: true }).press('Enter');
  const url = new URL((await ranged).url());
  const from = new Date(`${day}T00:00:00+07:00`).toISOString();
  const to = new Date(`${day}T23:59:59.999+07:00`).toISOString();
  expect(url.searchParams.get('from')).toBe(from);
  expect(url.searchParams.get('to')).toBe(to);
  return { from, to };
}
