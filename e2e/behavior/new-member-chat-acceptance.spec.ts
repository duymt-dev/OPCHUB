import { HIDDEN_MESSAGE_TEXT, reportSchema } from '@opchub/shared/api-domains';
import { z } from 'zod';
import { newMember, password } from '../server/new-member-acceptance';
import { expect, test, type Page } from '../server/test';
import { ADMIN_URL } from '../urls';

async function joinAndChat(page: Page) {
  const member = await newMember(page);
  const group = page.locator('article').filter({
    has: page.getByText('OPC Hải Phòng', { exact: true }),
  });
  await group.getByRole('button', { name: 'Đăng ký tham gia', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'OPC Hải Phòng', exact: true });
  await expect(dialog.getByRole('button', { name: 'Gửi yêu cầu tham gia' })).toHaveCount(0);
  await dialog.getByText(/^Tôi đồng ý tuân thủ nội quy cộng đồng/).click();
  await dialog.getByRole('button', { name: 'Tham gia ngay', exact: true }).click();
  await expect(dialog).toBeHidden();
  await group.getByRole('button', { name: 'Vào phòng chat', exact: true }).click();
  await expect(page.getByPlaceholder(/^Nhắn tin trong #/)).toBeVisible();
  return member;
}

async function send(page: Page, body: string) {
  const composer = page.getByPlaceholder(/^Nhắn tin trong #/);
  await composer.fill(body);
  await composer.press('Enter');
}

test('E2E-03 E2E-04 D-71 fresh trial member joins former approval group and sends persisted text', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const member = await joinAndChat(page);
  const body = `Xin chào cộng đồng từ ${member.name}`;
  await send(page, body);
  const message = page.getByRole('option').filter({ hasText: body });
  await expect(message).toHaveCount(1);
  await expect(message).toContainText(member.name);
  await page.reload();
  await expect(page.getByPlaceholder(/^Nhắn tin trong #/)).toBeVisible();
  await expect(message).toHaveCount(1);
  await expect(message).toContainText(member.name);
});

test('E2E-05 FX-01 new member second keyword violation revokes login and locks exactly seven days', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const member = await joinAndChat(page);
  const rows = page.getByRole('option');
  const hiddenBefore = await rows.filter({ hasText: HIDDEN_MESSAGE_TEXT }).count();
  const first = `vay nóng ${member.name} lần một`;
  await send(page, first);
  await expect(rows.filter({ hasText: HIDDEN_MESSAGE_TEXT })).toHaveCount(hiddenBefore + 1);
  await expect(rows.filter({ hasText: first })).toHaveCount(0);
  const beforeLock = Date.now();
  await send(page, `vay nóng ${member.name} lần hai`);
  await expect(page).toHaveURL(/\/login\?reason=locked$/);
  const afterLock = Date.now();
  await expect(page.locator('form').getByRole('alert')).toHaveText(
    'Tài khoản đã bị khóa, liên hệ hỗ trợ',
  );
  await page.locator('input[autocomplete=username], input[type=email]').fill(member.email);
  await page.locator('input[type=password]').fill(password);
  const rejected = page.waitForResponse((r) => new URL(r.url()).pathname === '/v1/auth/login');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  expect((await rejected).status()).toBe(403);
  await expect(page).toHaveURL(/\/login/);

  const admin = await context.newPage();
  await admin.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await admin
    .locator('input[autocomplete=username], input[type=email]')
    .fill('admin@opchub.community');
  await admin.locator('input[type=password]').fill('Admin@2026');
  await admin.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await admin.waitForURL((url) => !url.pathname.startsWith('/login'));
  await admin.locator('aside').getByText('Nhóm cộng đồng', { exact: true }).click();
  const reporting = admin.waitForResponse((r) => new URL(r.url()).pathname === '/v1/admin/reports');
  await admin.getByRole('tab', { name: /Kiểm duyệt tin nhắn/ }).click();
  const reports = z.object({ items: z.array(reportSchema) }).parse(await (await reporting).json());
  const violations = reports.items.filter((row) => row.senderName === member.name);
  expect(violations).toHaveLength(2);
  const sevenDays = 7 * 86_400_000;
  for (const violation of violations) {
    expect(violation).toMatchObject({ violations: 2, senderLocked: true, canLock: false });
    expect(violation.lockedUntil).not.toBeNull();
    const deadline = Date.parse(violation.lockedUntil ?? '');
    expect(deadline).toBeGreaterThanOrEqual(beforeLock + sevenDays);
    expect(deadline).toBeLessThanOrEqual(afterLock + sevenDays);
  }
  await expect(admin.getByLabel('Thời gian khóa')).toHaveValue('7');
  await expect(admin.locator('article').filter({ hasText: member.name })).toHaveCount(2);
});
