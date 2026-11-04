import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { openAffiliateDetail, signInAffiliate } from './helpers/affiliate-session';
test.use({ affiliateDemo: true, affiliatePayout: true });
test('REQ-619 D-119 accountant cannot pay affiliate directly; historical paid rows survive', async ({
  page,
}) => {
  await signInAffiliate(page, ADMIN_URL, 'mai.hoang@opchub.community', 'Admin@2026');
  await openAffiliateDetail(page, 'HAOPC', 'Lê Thu Hà');
  await expect(page.getByRole('button', { name: 'Chi trả', exact: true })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'GĐ Vùng chi', exact: true })).toBeVisible();
  await expect(page.getByText('GĐ Vùng chi', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Đã chi trả', { exact: true }).first()).toBeVisible();
  const status = await page.evaluate(
    async () =>
      (
        await fetch('/v1/admin/affiliates/removed/payouts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ monthKey: '2026-09' }),
        })
      ).status,
  );
  expect(status).toBe(404);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Chi trả', exact: true })).toHaveCount(0);
});
