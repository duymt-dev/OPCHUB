import { test, expect } from '../server/test';
import { ADMIN_URL, PORTAL_URL } from '../urls';
import { openAffiliateDetail, signInAffiliate } from './helpers/affiliate-session';

test.use({ affiliateDemo: true, affiliatePayout: true });

test('AT-AF06 REQ-309 missing bank returns 409, same dialog key retries after Portal bank update and preserves paid snapshots', async ({
  page,
  context,
}) => {
  await signInAffiliate(page, PORTAL_URL, 'ha.le@opcmedia.vn', 'User@2026');
  await expect(
    page.getByText('Chưa có số tài khoản nhận hoa hồng.', { exact: true }),
  ).toBeVisible();
  const admin = await context.newPage();
  await signInAffiliate(admin, ADMIN_URL, 'mai.hoang@opchub.community', 'Admin@2026');
  await openAffiliateDetail(admin, 'HAOPC', 'Lê Thu Hà');
  const month = admin.getByRole('row').filter({ hasText: 'Tháng 09/2026' });
  await month.getByRole('button', { name: 'Chi trả', exact: true }).click();
  const dialog = admin.getByRole('dialog', { name: 'Xác nhận chi trả hoa hồng', exact: true });
  await expect(dialog).toContainText('150.000đ');
  const failed = admin.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().endsWith('/payouts'),
  );
  await dialog.getByRole('button', { name: 'Chi trả', exact: true }).click();
  const missingBank = await failed;
  expect(missingBank.status()).toBe(409);
  const key = missingBank.request().headers()['idempotency-key'];
  expect(key).toBeTruthy();
  await expect(dialog).toBeVisible();
  await expect(
    admin.getByRole('status').filter({ hasText: 'Lê Thu Hà chưa cập nhật số tài khoản' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Cập nhật ngay', exact: true }).click();
  await page.getByLabel('Ngân hàng', { exact: true }).selectOption('BIDV');
  await page.getByLabel('Số tài khoản', { exact: true }).fill('715917091871');
  await page.getByLabel('Tên chủ tài khoản', { exact: true }).fill('LE THU HA');
  await page.getByRole('button', { name: 'Lưu tài khoản', exact: true }).click();
  await expect(page.getByText('BIDV · 715917091871', { exact: true })).toBeVisible();
  const paid = admin.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().endsWith('/payouts'),
  );
  await dialog.getByRole('button', { name: 'Chi trả', exact: true }).click();
  const success = await paid;
  expect(success.status()).toBe(200);
  expect(success.request().headers()['idempotency-key']).toBe(key);
  expect(await success.json()).toMatchObject({ paid: 1, amount: 150000 });
  await expect(dialog).toHaveCount(0);
  await admin.reload();
  await expect(month.getByRole('button', { name: 'Chi trả', exact: true })).toHaveCount(0);
  const current = admin.getByRole('row').filter({ hasText: 'Tháng 10/2026' });
  await expect(current).toHaveCount(1);
  await expect(current).toContainText('600.000đ');
  await expect(current.getByRole('button', { name: 'Chi trả', exact: true })).toHaveCount(0);
  await page.reload();
  await page.getByRole('tab', { name: /^Lịch sử nhận tiền/ }).click();
  const receipt = page.getByRole('row').filter({ hasText: 'BIDV · 715917091871' });
  await expect(receipt).toContainText('150.000đ');
  await expect(page.getByText('ACB · 24681357', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Sửa', exact: true }).click();
  await page.getByLabel('Số tài khoản', { exact: true }).fill('999555123');
  await page.getByRole('button', { name: 'Lưu tài khoản', exact: true }).click();
  await expect(page.getByText('BIDV · 999555123', { exact: true })).toBeVisible();
  await page.reload();
  await expect(receipt).toContainText('150.000đ');
});

test.describe('expired owner', () => {
  test.use({ affiliatePaused: true });
  // D-110 (TIP-V42-707): đại lý hết phí không còn tạm dừng — khoản tháng đã chốt vẫn chi trả được
  test('D-110 REQ-307 expired owner stays active, closed-month commissions remain payable', async ({
    page,
    context,
  }) => {
    await signInAffiliate(page, ADMIN_URL, 'mai.hoang@opchub.community', 'Admin@2026');
    await openAffiliateDetail(page, 'HAOPC', 'Lê Thu Hà');
    await expect(page.getByText('Tạm dừng', { exact: true })).toHaveCount(0);
    const owner = await context.newPage();
    await signInAffiliate(owner, PORTAL_URL, 'ha.le@opcmedia.vn', 'User@2026');
    await expect(owner.getByRole('button', { name: 'Cập nhật ngay', exact: true })).toBeVisible();
    await expect(
      owner.getByText('Mã đang tạm dừng — gia hạn phí để tiếp tục nhận hoa hồng', { exact: true }),
    ).toHaveCount(0);
    await owner.getByRole('button', { name: 'Cập nhật ngay', exact: true }).click();
    await owner.getByLabel('Ngân hàng', { exact: true }).selectOption('BIDV');
    await owner.getByLabel('Số tài khoản', { exact: true }).fill('715917091871');
    await owner.getByLabel('Tên chủ tài khoản', { exact: true }).fill('LE THU HA');
    await owner.getByRole('button', { name: 'Lưu tài khoản', exact: true }).click();
    await expect(owner.getByText('BIDV · 715917091871', { exact: true })).toBeVisible();
    await page.reload();
    await page
      .getByRole('row')
      .filter({ hasText: 'Tháng 09/2026' })
      .getByRole('button', { name: 'Chi trả', exact: true })
      .click();
    const paid = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().endsWith('/payouts'),
    );
    await page
      .getByRole('dialog', { name: 'Xác nhận chi trả hoa hồng', exact: true })
      .getByRole('button', { name: 'Chi trả', exact: true })
      .click();
    expect((await paid).status()).toBe(200);
    await owner.reload();
    await owner.getByRole('tab', { name: /^Lịch sử nhận tiền/ }).click();
    await expect(owner.getByRole('row').filter({ hasText: 'BIDV · 715917091871' })).toContainText(
      '150.000đ',
    );
  });
});
