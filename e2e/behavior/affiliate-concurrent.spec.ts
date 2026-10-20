import { test, expect, type Page } from '../server/test';
import { ADMIN_URL, PORTAL_URL } from '../urls';
import { openAffiliateDetail, signInAffiliate } from './helpers/affiliate-session';

test.use({ affiliateDemo: true });

async function prepareRate(page: Page, code: string, name: string, rate: string) {
  await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
  await openAffiliateDetail(page, code, name);
  await page.getByRole('button', { name: 'Sửa (Admin)', exact: true }).click();
  const dialog = page.getByRole('form', { name: 'Đặt tỷ lệ hoa hồng', exact: true });
  await dialog.getByRole('spinbutton', { name: 'Tỷ lệ hoa hồng (%)', exact: true }).fill(rate);
  return dialog;
}

test('REQ-308 REQ-410 concurrent tabs preserve both agent writes across origins and reload', async ({
  page,
  context,
}) => {
  const second = await context.newPage();
  const ha = await prepareRate(page, 'HAOPC', 'Lê Thu Hà', '31');
  const khoa = await prepareRate(second, 'KHOAOPC', 'Trần Minh Khoa', '33');
  const firstResponse = page.waitForResponse(
    (r) => r.request().method() === 'PATCH' && /\/admin\/affiliates\/[^/]+$/.test(r.url()),
  );
  const secondResponse = second.waitForResponse(
    (r) => r.request().method() === 'PATCH' && /\/admin\/affiliates\/[^/]+$/.test(r.url()),
  );
  await Promise.all([
    ha.getByRole('button', { name: 'Lưu', exact: true }).click(),
    khoa.getByRole('button', { name: 'Lưu', exact: true }).click(),
  ]);
  expect((await firstResponse).status()).toBe(200);
  expect((await secondResponse).status()).toBe(200);
  await expect(ha).toHaveCount(0);
  await expect(khoa).toHaveCount(0);
  await Promise.all([page.reload(), second.reload()]);
  await expect(page.getByText('31%', { exact: true })).toBeVisible();
  await expect(second.getByText('33%', { exact: true })).toBeVisible();

  const owner = await context.newPage();
  await signInAffiliate(owner, PORTAL_URL, 'ha.le@opcmedia.vn', 'User@2026');
  await expect(
    owner.getByRole('heading', { name: 'Giới thiệu thành viên mới, nhận 31% hoa hồng' }),
  ).toBeVisible();
  await page.goto(`${ADMIN_URL}/affiliate?tab=aff`);
  await page.getByPlaceholder('Tìm tên, mã giới thiệu, email...').fill('KHOAOPC');
  await expect(page.getByRole('row').filter({ hasText: 'KHOAOPC' })).toContainText('33%');
});
