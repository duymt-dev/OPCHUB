import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL, PORTAL_URL } from '../urls';

/**
 * TIP-V2-107 — IV-R01…R03, UAT-20, AT-IV01: MỘT luồng trao đổi nhà đầu tư ↔ OPC Hub dùng chung
 * giữa Portal ("Trao đổi với OPC Hub") và Admin (Nhà đầu tư › Chi tiết). Hai app cùng dữ liệu:
 * server thật cùng bảng `investor_comments`; MSW chép qua cookie chung host (V2Q-72).
 */

const SOLO = 'SoloBooks';
const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });

async function portalLogin(page: Page) {
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

async function openSolo(page: Page) {
  await portalLogin(page);
  await page.locator('aside').getByText('Dự án OPC', { exact: true }).click();
  await page.getByText(SOLO, { exact: true }).last().click();
  await expect(page.getByText('Giới thiệu dự án')).toBeVisible();
}

/** Thành viên demo gửi quan tâm đầu tư SoloBooks (P-70 → P-71) */
async function sendInterest(page: Page) {
  await page.getByRole('button', { name: 'Quan tâm đầu tư' }).last().click();
  const dialog = page.getByRole('dialog', { name: `Quan tâm đầu tư · ${SOLO}` });
  await dialog.getByPlaceholder('+84 912 345 678').fill('0912345678');
  await dialog.getByPlaceholder('Tối thiểu 100 triệu ₫').fill('100000000');
  await dialog.getByRole('button', { name: 'Gửi quan tâm' }).click();
  await expect(page.getByText(/✓ Đã gửi quan tâm/)).toBeVisible();
}

const threadBox = (page: Page) => page.getByPlaceholder('Nhắn cho Admin OPC Hub…');

async function adminDrawer(page: Page, name: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.locator('aside').getByText('Nhà đầu tư', { exact: true }).click();
  const row = page.locator('[data-m="tbl"]').getByRole('row').filter({ hasText: name });
  await row.getByRole('button', { name: 'Chi tiết' }).click();
  return page.getByRole('dialog', { name: 'Thông tin nhà đầu tư' });
}

test.describe('Trao đổi nhà đầu tư (TIP-V2-107)', () => {
  test('IV-R02 thành viên gửi quan tâm → thấy khối Trao đổi với OPC Hub, gửi tin bằng Enter', async ({
    page,
  }) => {
    await openSolo(page);
    await sendInterest(page);
    await expect(page.getByText('Trao đổi với OPC Hub')).toBeVisible();
    await expect(
      page.getByText('Admin OPC Hub sẽ phản hồi quan tâm đầu tư của bạn tại đây.'),
    ).toBeVisible();

    await threadBox(page).fill('Chào OPC Hub, tôi muốn xem pitch deck.');
    await threadBox(page).press('Shift+Enter');
    await threadBox(page).pressSequentially('Cảm ơn.');
    await threadBox(page).press('Enter');
    await expect(toast(page)).toHaveText('Đã gửi tới Admin OPC Hub');
    await expect(
      page.getByText(/Chào OPC Hub, tôi muốn xem pitch deck\.\s*Cảm ơn\./),
    ).toBeVisible();
    await expect(threadBox(page)).toHaveValue('');
  });

  test('UAT-20 AT-IV01 Admin gửi → thành viên thấy thông báo + tin', async ({ page, context }) => {
    await openSolo(page);
    await sendInterest(page);
    await threadBox(page).fill('Tôi đã gửi quan tâm, mong được phản hồi.');
    await threadBox(page).press('Enter');
    await expect(toast(page)).toHaveText('Đã gửi tới Admin OPC Hub');

    // Admin thấy tin của NĐT trong cùng luồng, trả lời → Đang trao đổi
    const admin = await context.newPage();
    const d = await adminDrawer(admin, 'Nguyễn Văn An');
    await expect(d.getByText('Tôi đã gửi quan tâm, mong được phản hồi.')).toBeVisible();
    const box = d.getByPlaceholder('Viết bình luận cho nhà đầu tư… (Enter để gửi)');
    await box.fill('Chào anh An, OPC Hub sẽ gửi pitch deck trong tuần.');
    await box.press('Enter');
    await expect(toast(admin)).toHaveText('Đã gửi tới Nguyễn Văn An');
    await expect(d.getByRole('radio', { name: 'Đang trao đổi' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    // NĐT: thông báo `invest` (worker relay ở server — chờ tới khi có) → mở về trang dự án
    await expect(async () => {
      await portalLogin(page);
      await page.getByRole('button', { name: 'Thông báo' }).click();
      await expect(page.getByText('OPC Hub đã phản hồi quan tâm đầu tư của bạn')).toBeVisible({
        timeout: 2_000,
      });
    }).toPass({ timeout: 30_000 });
    await page.getByText('OPC Hub đã phản hồi quan tâm đầu tư của bạn').click();
    await expect(page).toHaveURL(/\/projects\/[^/]+$/);
    await expect(page.getByText('Trao đổi với OPC Hub')).toBeVisible();
    await expect(
      page.getByText('Chào anh An, OPC Hub sẽ gửi pitch deck trong tuần.'),
    ).toBeVisible();
    await expect(page.getByText('Tôi đã gửi quan tâm, mong được phản hồi.')).toBeVisible();
  });
});
