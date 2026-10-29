import { expect, test } from '../server/test';
import { PORTAL_URL } from '../urls';
import { resetDemo, sql } from './lib';

test('D-109 public project disappears at fee expiry and returns without moderation', async ({
  page,
}) => {
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Google/ }).click();
  await page.getByRole('button', { name: /^Cá nhân/ }).click();
  await page.getByText(/^Tôi xác nhận là người đại diện hợp pháp/).click();
  await page.getByRole('button', { name: 'Hoàn tất và vào cộng đồng' }).click();
  await expect(page).toHaveURL(/\/community$/);
  await page
    .getByRole('dialog', { name: 'Đã gửi email chào mừng' })
    .getByRole('button', { name: 'Đóng' })
    .click();
  const declaration = page.getByRole('dialog', {
    name: 'Hoàn tất thông tin tham gia',
    exact: true,
  });
  await declaration.getByRole('radio', { name: /Freelancer/ }).click();
  await declaration.getByRole('button', { name: 'Lưu & tiếp tục', exact: true }).click();
  await expect(declaration).toHaveCount(0);
  await page.goto(`${PORTAL_URL}/projects?q=OPC%20Hub%20Mobile`, { waitUntil: 'domcontentloaded' });
  const project = page.getByText('OPC Hub Mobile', { exact: true });
  await expect(project).toBeVisible();
  try {
    // Keep active status to prove validUntil is checked immediately, before the expiry worker.
    sql(
      "UPDATE membership_fees SET status='active', valid_until=now()-interval '1 day' WHERE user_id='m1'",
    );
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(project).toHaveCount(0);
    await expect(page.getByText('Không tìm thấy dự án phù hợp', { exact: true })).toBeVisible();
    expect(sql("SELECT status FROM projects WHERE id='p10'")).toEqual([['published']]);
    sql(
      "UPDATE membership_fees SET status='active', valid_until=now()+interval '30 days' WHERE user_id='m1'",
    );
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(project).toBeVisible();
    await project.click();
    await expect(page).toHaveURL(/\/projects\/p10$/);
    await expect(page.getByText('Giới thiệu dự án', { exact: true })).toBeVisible();
    expect(sql("SELECT status FROM projects WHERE id='p10'")).toEqual([['published']]);
  } finally {
    resetDemo();
  }
});
