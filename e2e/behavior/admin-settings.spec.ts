import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ADMIN_URL } from '../urls';

/**
 * G6a — D-66 → D-77 Cài đặt & Phân quyền (Admin): mỗi tab sửa + lưu; phân quyền lưu có xác nhận
 * (D-42); SMTP lỗi / OK (D-72); mời / thu hồi quản trị viên; SSO + chính sách (D-33, D-44);
 * ngôn ngữ; nhật ký hoạt động ghi lại thao tác (luật 10).
 */

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });
const tab = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Mục cài đặt' })
    .getByRole('button')
    .filter({ hasText: name })
    .first();
const dialog = (page: Page) => page.getByRole('alertdialog');

async function openSettings(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.locator('aside').getByText('Cài đặt & Phân quyền', { exact: true }).click();
  await expect(page.getByText('Thông tin nền tảng')).toBeVisible();
}

test.describe('Admin · Cài đặt & Phân quyền', () => {
  test('Chung: sửa tên + công tắc đăng ký lưu được; tab trên URL', async ({ page }) => {
    await openSettings(page);
    const name = page.getByLabel('Tên nền tảng');
    await name.fill('OPC Hub ASEAN');
    await name.press('Enter');
    await expect(toast(page)).toHaveText('Đã lưu cài đặt chung');
    const email = page.getByLabel('Email liên hệ');
    await email.fill('sai-email');
    await email.press('Enter');
    await expect(toast(page)).toHaveText('Email liên hệ không hợp lệ');
    const open = page.getByRole('switch', { name: /Cho phép tự đăng ký/ });
    await expect(open).toHaveAttribute('aria-checked', 'true');
    await open.click();
    await expect(open).toHaveAttribute('aria-checked', 'false');

    await tab(page, 'Danh mục lĩnh vực').click();
    await expect(page).toHaveURL(/tab=categories/);
    await expect(page.getByText('Thêm lĩnh vực mới')).toBeVisible();
    // Quay lại tab Chung: giá trị đã lưu ở server (không phải state cục bộ)
    await tab(page, 'Chung').click();
    await expect(page.getByLabel('Tên nền tảng')).toHaveValue('OPC Hub ASEAN');
    await expect(open).toHaveAttribute('aria-checked', 'false');
  });

  test('Lĩnh vực: thêm, sửa (?edit=), ẩn, xoá có xác nhận, đang dùng thì chặn', async ({
    page,
  }) => {
    await openSettings(page);
    await tab(page, 'Danh mục lĩnh vực').click();
    const input = page.getByPlaceholder('Tên lĩnh vực, VD: Năng lượng tái tạo');
    await input.fill('Năng lượng tái tạo');
    await page.getByRole('button', { name: '+ Thêm' }).click();
    await expect(toast(page)).toHaveText('Đã thêm lĩnh vực Năng lượng tái tạo');
    await expect(page.getByText('15 đang hiển thị · 0 đã ẩn')).toBeVisible();

    await input.fill('fintech');
    await page.getByRole('button', { name: '+ Thêm' }).click();
    await expect(toast(page)).toHaveText('Lĩnh vực đã tồn tại');
    await input.fill('');

    const row = page.getByRole('row').filter({ hasText: 'Năng lượng tái tạo' });
    await row.getByRole('button', { name: 'Sửa' }).click();
    await expect(page).toHaveURL(/edit=/);
    await expect(page.getByText('Sửa lĩnh vực')).toBeVisible();
    await page.getByPlaceholder('Tên lĩnh vực, VD: Năng lượng tái tạo').fill('Năng lượng xanh');
    await page.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(toast(page)).toHaveText('Đã cập nhật lĩnh vực Năng lượng xanh');
    await expect(page).not.toHaveURL(/edit=/);

    const green = page.getByRole('row').filter({ hasText: 'Năng lượng xanh' });
    await green.getByRole('switch').click();
    await expect(page.getByText('14 đang hiển thị · 1 đã ẩn')).toBeVisible();
    await green.getByRole('button', { name: 'Xoá' }).click();
    await expect(dialog(page)).toContainText('Xoá lĩnh vực?');
    await dialog(page).getByRole('button', { name: 'Xoá' }).click();
    await expect(toast(page)).toHaveText('Đã xoá lĩnh vực Năng lượng xanh');

    await page
      .getByRole('row')
      .filter({ hasText: 'AI / SaaS' })
      .getByRole('button', { name: 'Xoá' })
      .click();
    await expect(toast(page)).toHaveText('Lĩnh vực đang được sử dụng – hãy ẩn thay vì xoá');
    await expect(dialog(page)).toHaveCount(0);
  });

  test('Phân quyền: tích ô, Lưu hỏi xác nhận (D-42), Super Admin khoá cứng', async ({ page }) => {
    await openSettings(page);
    await tab(page, 'Vai trò & phân quyền').click();
    const sa = page.getByRole('checkbox', { name: 'Xem nhật ký hoạt động — Super Admin' });
    await expect(sa).toHaveAttribute('aria-checked', 'true');
    await sa.click({ force: true });
    await expect(sa).toHaveAttribute('aria-checked', 'true');

    const cell = page.getByRole('checkbox', { name: 'Xem nhật ký hoạt động — Thành viên' });
    await cell.click();
    await expect(cell).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(dialog(page)).toContainText('1 thay đổi');
    await dialog(page).getByRole('button', { name: 'Huỷ' }).click();
    await expect(dialog(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'Lưu', exact: true }).click();
    await dialog(page).getByRole('button', { name: 'Lưu phân quyền' }).click();
    await expect(toast(page)).toHaveText('Đã lưu phân quyền');

    await tab(page, 'Nhật ký hoạt động').click();
    await expect(page.getByText('cập nhật phân quyền vai trò')).toBeVisible();
  });

  test('Email chào mừng: sửa tiêu đề, thêm quy định, xem trước, lưu + gửi thử', async ({
    page,
  }) => {
    await openSettings(page);
    await tab(page, 'Email chào mừng').click();
    await page.getByLabel('Tiêu đề email').fill('Chào mừng tới OPC Hub');
    await page.getByRole('button', { name: '+ Thêm quy định' }).click();
    await page.getByLabel('Quy định 6', { exact: true }).fill('Giữ thông tin dự án trung thực');
    await expect(page.getByText('Giữ thông tin dự án trung thực').last()).toBeVisible();
    // D-47: không có công tắc / khối mật khẩu tạm
    await expect(page.getByRole('switch', { name: 'Tài khoản & mật khẩu truy cập' })).toHaveCount(
      0,
    );
    await expect(page.getByText('Mật khẩu tạm')).toHaveCount(0);
    await page.getByRole('button', { name: 'Lưu mẫu' }).click();
    await expect(toast(page)).toHaveText('Đã lưu mẫu email chào mừng');
    await page.getByRole('button', { name: 'Gửi thử' }).click();
    await expect(toast(page)).toHaveText('Đã gửi email thử tới admin@opchub.community');
  });

  test('SMTP: thiếu key → lỗi xác thực; nhập đủ → OK, gửi thử, lưu', async ({ page }) => {
    await openSettings(page);
    await tab(page, 'Gửi email (SMTP)').click();
    await page.getByRole('button', { name: 'Gửi thử' }).click();
    await expect(toast(page)).toHaveText('Hãy kiểm tra kết nối trước khi gửi thử');
    await page.getByRole('button', { name: 'Kiểm tra kết nối' }).click();
    await expect(
      page.getByText('Không xác thực được – kiểm tra lại SMTP login / key.'),
    ).toBeVisible();
    await expect(toast(page)).toHaveText('Vui lòng nhập SMTP login và SMTP key của Brevo');
    await expect(page.getByText('Kết nối thất bại')).toBeVisible();

    await page.getByPlaceholder('VD: 7a1b2c001@smtp-brevo.com').fill('7a1b2c001@smtp-brevo.com');
    await page.getByPlaceholder('xsmtpsib-...').fill('xsmtpsib-test-key');
    await page.getByRole('button', { name: 'Kiểm tra kết nối' }).click();
    await expect(toast(page)).toHaveText('Kết nối Brevo SMTP thành công');
    await expect(
      page.getByText('✓ Xác thực thành công với smtp-relay.brevo.com:587'),
    ).toBeVisible();
    await page.getByRole('radio', { name: 'SSL/TLS (465)' }).click();
    await expect(page.getByText('Chưa kiểm tra')).toBeVisible();
    await page.getByRole('button', { name: 'Kiểm tra kết nối' }).click();
    await expect(
      page.getByText('✓ Xác thực thành công với smtp-relay.brevo.com:465'),
    ).toBeVisible();

    await page.getByPlaceholder('email-nhan-thu@domain.com').fill('ops@opchub.vn');
    await page.getByRole('button', { name: 'Gửi thử' }).click();
    await page.getByRole('button', { name: 'Lưu cấu hình' }).click();
    await expect(toast(page)).toHaveText('Đã lưu cấu hình SMTP');
    await expect(
      page.getByPlaceholder('•••••••• (đã lưu — để trống nếu giữ nguyên)'),
    ).toBeVisible();
  });

  test('Tài khoản quản trị: email sai, mời, thu hồi có xác nhận, chủ sở hữu khoá', async ({
    page,
  }) => {
    await openSettings(page);
    await tab(page, 'Tài khoản quản trị').click();
    await expect(page.getByText('4 tài khoản có quyền truy cập Admin Dashboard')).toBeVisible();
    const email = page.getByPlaceholder('Email người được mời...');
    await email.fill('khong-hop-le');
    await page.getByRole('button', { name: 'Gửi lời mời' }).click();
    await expect(toast(page)).toHaveText('Email không hợp lệ');

    await email.fill('x@y.vn');
    await page.getByLabel('Vai trò người được mời').selectOption('moderator');
    await page.getByRole('button', { name: 'Gửi lời mời' }).click();
    await expect(toast(page)).toHaveText('Đã gửi lời mời tới x@y.vn');
    const row = page.getByRole('row').filter({ hasText: 'x@y.vn' });
    await expect(row).toContainText('Chờ chấp nhận');
    await expect(row).toContainText('Điều phối viên');
    await expect(page.getByText('5 tài khoản có quyền truy cập Admin Dashboard')).toBeVisible();

    await page
      .getByRole('row')
      .filter({ hasText: 'Nguyễn Văn An' })
      .getByRole('button', { name: 'Chủ sở hữu' })
      .click({ force: true });
    await expect(dialog(page)).toHaveCount(0);

    await row.getByRole('button', { name: 'Thu hồi' }).click();
    await expect(dialog(page)).toContainText('Thu hồi quyền quản trị?');
    await dialog(page).getByRole('button', { name: 'Thu hồi' }).click();
    await expect(toast(page)).toHaveText('Đã thu hồi quyền quản trị của x');
    await expect(page.getByText('4 tài khoản có quyền truy cập Admin Dashboard')).toBeVisible();

    await tab(page, 'Nhật ký hoạt động').click();
    // toast cùng chữ có thể còn trên màn → lấy dòng nhật ký (không phải role=status)
    await expect(
      page.getByText('thu hồi quyền quản trị của x').and(page.locator(':not([role=status])')),
    ).toBeVisible();
    await expect(page.getByText('mời x@y.vn làm Điều phối viên')).toBeVisible();
    await expect(page.getByText('bật đăng nhập bằng DeepSeek')).toBeVisible();
  });

  test('SSO + chính sách bảo mật (D-33, D-44)', async ({ page }) => {
    await openSettings(page);
    await tab(page, 'Đăng nhập & bảo mật').click();
    await expect(page).toHaveURL(/tab=sso/);
    await expect(page.getByText('6 đang bật')).toBeVisible();
    await page.getByRole('switch', { name: 'Bật/tắt DeepSeek' }).click();
    await expect(toast(page)).toHaveText('Đã tắt đăng nhập bằng DeepSeek');
    await expect(page.getByText('5 đang bật')).toBeVisible();
    await page.getByRole('button', { name: 'Cấu hình' }).first().click();
    await expect(toast(page)).toHaveText('Mở cấu hình Client ID / Secret cho Google');

    await page.getByLabel('Độ dài tối thiểu').selectOption('12');
    await expect(toast(page)).toHaveText('Đã lưu chính sách bảo mật');
    const lock = page.getByRole('switch', { name: /Khóa tạm sau 5 lần đăng nhập sai/ });
    await expect(lock).toHaveAttribute('aria-checked', 'true');
    await lock.click();
    await expect(lock).toHaveAttribute('aria-checked', 'false');
    const tfa = page.getByRole('switch', { name: /Bắt buộc 2FA cho quản trị viên/ });
    await tfa.click();
    await expect(tfa).toHaveAttribute('aria-checked', 'false');
    await tab(page, 'Chung').click();
    await tab(page, 'Đăng nhập & bảo mật').click();
    await expect(page.getByLabel('Độ dài tối thiểu')).toHaveValue('12');
    await expect(lock).toHaveAttribute('aria-checked', 'false');
  });

  test('Ngôn ngữ: đổi mặc định, bật/tắt, không tắt được ngôn ngữ mặc định', async ({ page }) => {
    await openSettings(page);
    await tab(page, 'Ngôn ngữ').click();
    await expect(page.getByText('Ngôn ngữ ASEAN')).toBeVisible();
    const vi = page.getByRole('switch', { name: /Tiếng Việt/ });
    await vi.click();
    await expect(toast(page)).toHaveText('Không thể tắt ngôn ngữ mặc định');
    await expect(vi).toHaveAttribute('aria-checked', 'true');

    const lao = page.getByRole('switch', { name: /ພາສາລາວ/ });
    await lao.click();
    await expect(lao).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByRole('button', { name: 'Ngôn ngữ 11 ngôn ngữ' })).toBeVisible();

    await page.getByLabel('Mặc định').selectOption('en');
    await expect(toast(page)).toHaveText('Đã đặt English làm ngôn ngữ mặc định');
    await vi.click();
    await expect(vi).toHaveAttribute('aria-checked', 'false');
  });
});
