import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { signInAffiliate } from './helpers/affiliate-session';
import { captureAffiliateDialog } from './helpers/affiliate-dialog-capture';

test.use({ affiliateDemo: true });

for (const width of [360, 390]) {
  test(`REQ-310 REQ-312 cancellation dialog fits ${width}px; blank/cancel writes nothing, valid reason survives F5`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 });
    await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    await page.getByPlaceholder('Tìm thành viên hoặc affiliate...').fill('Nguyễn Văn An');
    await expect(page.getByRole('row').filter({ hasText: 'Nguyễn Văn An' })).toHaveCount(9);
    await expect(page).toHaveURL(/q=/);
    const first = page.getByRole('row').filter({ hasText: 'Đỗ Minh Tuấn' });
    const second = page.getByRole('row').filter({ hasText: 'Đặng Ngọc Ánh' });
    const select = async () => {
      await first.getByRole('checkbox').check();
      await second.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'Hủy', exact: true }).click();
    };
    let writes = 0;
    page.on('request', (r) => {
      if (r.url().endsWith('/admin/affiliate/commissions/cancel') && r.method() === 'POST')
        writes++;
    });
    await select();
    const dialog = page.getByRole('dialog', { name: 'Hủy hoa hồng', exact: true });
    const reason = dialog.getByLabel('Lý do hủy', { exact: true });
    const confirm = dialog.getByRole('button', { name: 'Xác nhận', exact: true });
    await expect(confirm).toBeDisabled();
    await reason.fill('   ');
    await expect(confirm).toBeDisabled();
    await captureAffiliateDialog(page, dialog, width, 'cancel-blank', info);
    await reason.fill('Bản nháp không xác nhận');
    await dialog.getByText('Đóng', { exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(writes).toBe(0);
    await expect(first).toContainText('Đã ghi nhận');
    await select();
    await expect(reason).toHaveValue('');
    await reason.fill('  Vi phạm điều khoản mobile  ');
    await captureAffiliateDialog(page, dialog, width, 'cancel-valid', info);
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith('/admin/affiliate/commissions/cancel') && r.request().method() === 'POST',
    );
    await confirm.click();
    const result = await response;
    expect(result.status()).toBe(200);
    expect(await result.json()).toEqual({ cancelled: 2 });
    expect(result.request().postDataJSON()).toMatchObject({ reason: 'Vi phạm điều khoản mobile' });
    await expect(dialog).toBeHidden();
    expect(writes).toBe(1);
    await page.reload();
    for (const row of [first, second]) {
      await expect(
        row.getByLabel('Đã hủy: Vi phạm điều khoản mobile', { exact: true }),
      ).toBeVisible();
      await expect(row).toContainText('120.000đ');
    }
    await expect(page.getByRole('row').filter({ hasText: 'Cao Văn Nam' })).toContainText(
      'Đã ghi nhận',
    );
  });

  test(`REQ-308 REQ-312 bulk-rate dialog fits ${width}px; invalid/cancel writes nothing, two-agent save persists`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 });
    await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    await page.getByRole('tab', { name: /^Affiliate/ }).click();
    await page.getByPlaceholder('Tìm tên, mã giới thiệu, email...').fill('OPC');
    await page.getByRole('combobox', { name: 'Số dòng mỗi trang' }).selectOption('100');
    await expect(page).toHaveURL(/size=100/);
    await expect(page).toHaveURL(/q=OPC/);
    const ha = page.getByRole('row').filter({ hasText: 'HAOPC' });
    const khoa = page.getByRole('row').filter({ hasText: 'KHOAOPC' });
    const select = async () => {
      await ha.getByRole('checkbox').check();
      await khoa.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'Đặt %', exact: true }).click();
    };
    let writes = 0;
    page.on('request', (r) => {
      if (r.url().endsWith('/admin/affiliates/rate') && r.method() === 'PUT') writes++;
    });
    await select();
    const dialog = page.getByRole('dialog', { name: 'Đặt tỷ lệ hoa hồng', exact: true });
    const rate = dialog.getByRole('spinbutton', { name: 'Tỷ lệ hoa hồng (%)', exact: true });
    const save = dialog.getByRole('button', { name: 'Lưu', exact: true });
    await rate.fill('');
    await expect(save).toBeDisabled();
    await expect(dialog.getByRole('alert')).toHaveText('Tỷ lệ hoa hồng từ 1 đến 50%');
    await captureAffiliateDialog(page, dialog, width, 'rate-invalid', info);
    await dialog.getByText('Đóng', { exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(writes).toBe(0);
    await expect(ha).toContainText('25%');
    await select();
    await rate.fill('30');
    await captureAffiliateDialog(page, dialog, width, 'rate-valid', info);
    const response = page.waitForResponse(
      (r) => r.url().endsWith('/admin/affiliates/rate') && r.request().method() === 'PUT',
    );
    await save.click();
    const result = await response;
    expect(result.status()).toBe(200);
    expect(await result.json()).toEqual({ updated: 2 });
    expect(result.request().postDataJSON()).toMatchObject({ rate: 30 });
    await expect(dialog).toBeHidden();
    expect(writes).toBe(1);
    await page.reload();
    await expect(ha).toContainText('30%');
    await expect(khoa).toContainText('30%');
  });
}
