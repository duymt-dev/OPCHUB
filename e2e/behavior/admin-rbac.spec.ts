import { createHmac } from 'node:crypto';
import { setRoleGrants } from '../server/api';
import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL } from '../urls';

/**
 * TIP-V2-204 — phân quyền §21 trên Admin FE (AT-RB01 → 06, AT-SEC01, REQ-329, REQ-352, REQ-228).
 * Chạy cả msw và server, cùng assertion. MSW giữ CSDL giả theo trang nên mọi bước trong một test
 * đi bằng điều hướng phía client (đăng xuất → đăng nhập TK khác trên cùng trang).
 */

const PWD = 'Admin@2026';
const SUPER = 'admin@opchub.community';
const YEN = 'yen.do@opchub.community';
const MAI = 'mai.hoang@opchub.community';
const TRANG = 'trang.pham@opchub.community';

const toast = (page: Page, text: string) =>
  page.getByRole('status').filter({ hasText: text }).first();
const dialog = (page: Page) => page.getByRole('alertdialog');
const tab = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Mục cài đặt' })
    .getByRole('button')
    .filter({ hasText: name })
    .first();
const menus = (page: Page) =>
  page.locator('aside nav a[title]').evaluateAll((as) => as.map((a) => a.getAttribute('title')));
const go = (page: Page, label: string) =>
  page.locator('aside').getByText(label, { exact: true }).click();

async function signIn(page: Page, email: string, password = PWD) {
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
}

async function open(page: Page, email: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await signIn(page, email);
  await page.waitForURL(/\/overview$/);
}

async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Đăng xuất' }).filter({ visible: true }).first().click();
  await page.waitForURL(/\/login$/);
}

/** RFC 6238 (SHA-1, 6 số, 30 giây) từ liên kết otpauth màn thiết lập 2FA */
function totpOf(uri: string): string {
  const b32 = new URL(uri).searchParams.get('secret') ?? '';
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of b32) {
    value = (value << 5) | A.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const h = createHmac('sha1', Buffer.from(bytes)).update(msg).digest();
  const off = (h[h.length - 1] ?? 0) & 0x0f;
  return String((h.readUInt32BE(off) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

async function setUp2fa(page: Page) {
  await page.waitForURL(/\/two-factor$/);
  const uri = (await page.getByTestId('totp-uri').textContent()) ?? '';
  await page.getByLabel('Mã 6 số').fill(totpOf(uri));
  await page.getByRole('button', { name: 'Bật xác thực 2 lớp' }).click();
  await page.waitForURL(/\/overview$/);
}

test.describe('Admin · Phân quyền §21', () => {
  test('AT-RB02 Kế toán thấy đúng menu và chỉ tab Nhật ký', async ({ page }) => {
    await open(page, MAI);
    expect(await menus(page)).toEqual([
      'Tổng quan',
      'Thành viên',
      'Phí thành viên',
      'Dịch vụ',
      'Cài đặt & Phân quyền',
    ]);
    await go(page, 'Cài đặt & Phân quyền');
    const tabs = page.getByRole('navigation', { name: 'Mục cài đặt' }).getByRole('button');
    await expect(tabs).toHaveCount(1);
    await expect(tabs.first()).toContainText('Nhật ký hoạt động');
  });

  test('AT-RB03 Giảng viên chỉ xem Thành viên: dải chỉ xem, chặn Xuất, vẫn tìm được', async ({
    page,
  }) => {
    await open(page, YEN);
    await go(page, 'Thành viên');
    await expect(
      page.getByText('Chế độ chỉ xem — vai trò Giảng viên không có quyền thao tác trong mục này.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Xuất CSV' }).click();
    await expect(toast(page, 'Vai trò Giảng viên chỉ có quyền xem mục này')).toBeVisible();
    await page.getByPlaceholder('Tìm theo tên, email...').fill('Lê Minh Anh');
    await expect(page.getByText('· 1 tài khoản')).toBeVisible();
  });

  test('AT-RB04 TK quản trị bị khoá không đăng nhập được', async ({ page }) => {
    await open(page, SUPER);
    await go(page, 'Cài đặt & Phân quyền');
    await tab(page, 'Tài khoản quản trị').click();
    const row = page.getByRole('row').filter({ hasText: YEN });
    await row.getByRole('button', { name: 'Khóa', exact: true }).click();
    await dialog(page).getByRole('button', { name: 'Khóa', exact: true }).click();
    await expect(row).toContainText('Đã khóa');
    await signOut(page);
    await signIn(page, YEN);
    await expect(page.locator('form').getByRole('alert')).toHaveText(
      'Tài khoản quản trị đã bị khóa',
    );
  });

  test('AT-RB05 xoá vai trò đang có TK bị chặn', async ({ page }) => {
    await open(page, SUPER);
    await go(page, 'Cài đặt & Phân quyền');
    await tab(page, 'Vai trò & phân quyền').click();
    await page.getByRole('button', { name: '+ Thêm vai trò' }).click();
    await page.getByLabel('Tên vai trò, VD: Kiểm soát viên').fill('Kiểm soát viên');
    await page.getByRole('button', { name: 'Thêm', exact: true }).click();
    await expect(toast(page, 'Đã thêm vai trò Kiểm soát viên')).toBeVisible();
    await tab(page, 'Tài khoản quản trị').click();
    await page.getByLabel('Vai trò của Đỗ Hải Yến').selectOption({ label: 'Kiểm soát viên' });
    await expect(toast(page, 'Đã đổi vai trò Đỗ Hải Yến thành Kiểm soát viên')).toBeVisible();
    await tab(page, 'Vai trò & phân quyền').click();
    await page.getByRole('button', { name: 'Xóa vai trò Kiểm soát viên' }).click();
    await dialog(page).getByRole('button', { name: 'Xóa vai trò' }).click();
    await expect(
      toast(page, 'Vai trò đang có 1 tài khoản, hãy đổi vai trò các tài khoản trước'),
    ).toBeVisible();
    await expect(page.locator('[data-role="Kiểm soát viên"]')).toBeVisible();
  });

  test('AT-RB06 menu Thành viên không có TK quản trị', async ({ page }) => {
    await open(page, SUPER);
    await go(page, 'Thành viên');
    await page.getByPlaceholder('Tìm theo tên, email...').fill('opchub.community');
    await expect(page.getByText('· 0 tài khoản')).toBeVisible();
    await expect(page.locator('[data-m="tbl"] select')).toHaveCount(0);
  });

  test('AT-RB01 + AT-SEC01 tạo TK (email thành viên báo tại ô) rồi đổi mật khẩu lần đầu', async ({
    page,
  }) => {
    await open(page, SUPER);
    await go(page, 'Cài đặt & Phân quyền');
    await tab(page, 'Tài khoản quản trị').click();
    await page.getByRole('button', { name: '+ Tạo tài khoản quản trị' }).click();
    const drawer = page.getByRole('dialog', { name: 'Tạo tài khoản quản trị' });
    await drawer.getByPlaceholder('Nguyễn Văn A').fill('Lý Biên Tập');
    await drawer.getByPlaceholder('ten@opchub.community').fill('an.nguyen@mediasoft.vn');
    await drawer.getByRole('radio', { name: /^Biên tập nội dung/ }).click();
    await drawer.getByRole('button', { name: 'Tạo tài khoản' }).click();
    await expect(
      drawer.getByText('Email đã là tài khoản thành viên, vui lòng dùng email nội bộ riêng'),
    ).toBeVisible();
    const email = 'ly.bientap@opchub.community';
    await drawer.getByPlaceholder('ten@opchub.community').fill(email);
    const temp = await drawer.getByLabel(/Mật khẩu tạm/).inputValue();
    await drawer.getByRole('button', { name: 'Tạo tài khoản' }).click();
    await expect(toast(page, 'Đã tạo tài khoản quản trị Lý Biên Tập')).toBeVisible();

    await signOut(page);
    await signIn(page, email, temp);
    await page.waitForURL(/\/first-password$/);
    await expect(page.getByText('Đổi mật khẩu lần đầu')).toBeVisible();
    const submit = page.getByRole('button', { name: 'Đổi mật khẩu & đăng nhập' });
    await page.getByLabel('Mật khẩu mới', { exact: true }).fill('yeu');
    await page.getByLabel('Nhập lại mật khẩu mới').fill('yeu');
    await submit.click();
    await expect(
      page.getByText('Mật khẩu mới tối thiểu 8 ký tự, có chữ hoa và chữ số'),
    ).toBeVisible();
    await page.getByLabel('Mật khẩu mới', { exact: true }).fill('BienTap2026');
    await page.getByLabel('Nhập lại mật khẩu mới').fill('BienTap2027');
    await submit.click();
    await expect(page.getByText('Mật khẩu nhập lại không khớp')).toBeVisible();
    await page.getByLabel('Nhập lại mật khẩu mới').fill('BienTap2026');
    await submit.click();
    await page.waitForURL(/\/overview$/);
    expect(await menus(page)).toEqual([
      'Tổng quan',
      'Nhóm cộng đồng',
      'Bot tương tác',
      'Nội dung & Sự kiện',
      'Dự án',
    ]);
  });

  test('REQ-329 xem thử vai trò: dải cam + menu theo vai trò, Thoát xem thử khôi phục', async ({
    page,
  }) => {
    await open(page, SUPER);
    const all = await menus(page);
    expect(all).toHaveLength(11);
    await go(page, 'Cài đặt & Phân quyền');
    await tab(page, 'Vai trò & phân quyền').click();
    await page.getByLabel('Xem thử menu theo vai trò').selectOption({ label: 'Biên tập nội dung' });
    await expect(
      page.getByText(
        'Đang xem thử Admin với vai trò Biên tập nội dung — chỉ hiện các menu vai trò này được phép.',
      ),
    ).toBeVisible();
    expect(await menus(page)).toEqual([
      'Tổng quan',
      'Nhóm cộng đồng',
      'Bot tương tác',
      'Nội dung & Sự kiện',
      'Dự án',
    ]);
    await page.getByRole('button', { name: 'Thoát xem thử' }).click();
    await expect(page.getByText(/Đang xem thử Admin/)).toHaveCount(0);
    expect(await menus(page)).toEqual(all);
  });

  test('REQ-352 bắt buộc 2FA: lần đăng nhập sau thiết lập TOTP, cột 2FA = Đã bật', async ({
    page,
  }) => {
    await open(page, SUPER);
    await go(page, 'Cài đặt & Phân quyền');
    await tab(page, 'Đăng nhập & bảo mật').click();
    const tfa = page.getByRole('switch', { name: /Bắt buộc 2FA cho quản trị viên/ });
    await tfa.click();
    await expect(tfa).toHaveAttribute('aria-checked', 'true');
    await signOut(page);
    await signIn(page, TRANG);
    await setUp2fa(page);
    await signOut(page);
    await signIn(page, SUPER);
    await setUp2fa(page);
    await go(page, 'Cài đặt & Phân quyền');
    await tab(page, 'Tài khoản quản trị').click();
    await expect(page.getByRole('row').filter({ hasText: TRANG })).toContainText('Đã bật');
  });

  test('REQ-228 Super Admin bỏ quyền → phiên Giảng viên mất menu, không cần đăng nhập lại', async ({
    page,
  }) => {
    await open(page, YEN);
    expect(await menus(page)).toContain('Nội dung & Sự kiện');
    await setRoleGrants(page, 'lecturer', [
      'overview.view',
      'members.view',
      'groups.view',
      'groups.action',
    ]);
    await go(page, 'Nhóm cộng đồng');
    await expect(page.locator('aside nav a[title="Nội dung & Sự kiện"]')).toHaveCount(0);
    await expect(page).toHaveURL(/\/groups/);
  });
});
