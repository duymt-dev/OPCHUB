import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL } from '../urls';

/**
 * G6a — D-66 → D-77 Cài đặt & Phân quyền (Admin): mỗi tab sửa + lưu; ma trận 25 khoá §21 lưu có
 * xác nhận (NA-28); SMTP lỗi / OK (D-72); tạo / khoá / thu hồi TK quản trị (RB-R02, R08);
 * SSO + chính sách (D-33, D-44);
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

  test('Phân quyền §21: tích ô, Lưu hỏi xác nhận (NA-28), Super Admin khoá cứng', async ({
    page,
  }) => {
    await openSettings(page);
    await tab(page, 'Vai trò & phân quyền').click();
    await expect(tab(page, 'Vai trò & phân quyền')).toContainText('5 vai trò');
    const sa = page.getByRole('checkbox', { name: 'Nhật ký hoạt động — Super Admin' });
    await expect(sa).toHaveAttribute('aria-checked', 'true');
    await sa.click({ force: true });
    await expect(sa).toHaveAttribute('aria-checked', 'true');

    const cell = page.getByRole('checkbox', { name: 'Nhật ký hoạt động — Giảng viên' });
    await expect(cell).toHaveAttribute('aria-checked', 'false');
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
    // audit_logs chỉ INSERT (Q-B62-13): server giữ dòng của lượt trước → dòng mới nhất ở đầu
    await expect(page.getByText('cập nhật phân quyền').first()).toBeVisible();
  });

  test('AT-RB05 thêm vai trò tự tạo rồi xoá; vai trò hệ thống không có nút xoá', async ({
    page,
  }) => {
    await openSettings(page);
    await tab(page, 'Vai trò & phân quyền').click();
    await page.getByRole('button', { name: '+ Thêm vai trò' }).click();
    await page.getByLabel('Tên vai trò, VD: Kiểm soát viên').fill('Kiểm soát viên');
    await page.getByRole('button', { name: 'Thêm', exact: true }).click();
    await expect(toast(page)).toHaveText('Đã thêm vai trò Kiểm soát viên');
    await expect(tab(page, 'Vai trò & phân quyền')).toContainText('6 vai trò');
    await expect(page.getByRole('button', { name: 'Xóa vai trò Kế toán' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Xóa vai trò Kiểm soát viên' }).click();
    await expect(dialog(page)).toContainText('Xóa vai trò Kiểm soát viên?');
    await dialog(page).getByRole('button', { name: 'Xóa vai trò' }).click();
    await expect(toast(page)).toHaveText('Đã xóa vai trò Kiểm soát viên');
    await expect(tab(page, 'Vai trò & phân quyền')).toContainText('5 vai trò');
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

  test('AT-RB01 TK quản trị: 6 TK, tạo (chặn email thành viên), khoá, thu hồi', async ({
    page,
  }) => {
    await openSettings(page);
    await tab(page, 'Tài khoản quản trị').click();
    await expect(page.getByText(/^6 tài khoản nội bộ có quyền truy cập/)).toBeVisible();
    const table = page.getByRole('table', { name: 'Tài khoản quản trị' });
    await expect(table.getByRole('row').filter({ hasText: '@opchub.community' })).toHaveCount(6);
    const owner = table.getByRole('row').filter({ hasText: 'admin@opchub.community' });
    await expect(owner).toContainText('Chủ sở hữu');
    await expect(owner.getByRole('button')).toHaveCount(0);

    await page.getByRole('button', { name: '+ Tạo tài khoản quản trị' }).click();
    const drawer = page.getByRole('dialog', { name: 'Tạo tài khoản quản trị' });
    await drawer.getByPlaceholder('Nguyễn Văn A').fill('Trần Kiểm Soát');
    await drawer.getByPlaceholder('ten@opchub.community').fill('an.nguyen@mediasoft.vn');
    await drawer.getByRole('radio', { name: /^Kế toán/ }).click();
    await drawer.getByRole('button', { name: 'Tạo tài khoản' }).click();
    await expect(
      drawer.getByText('Email đã là tài khoản thành viên, vui lòng dùng email nội bộ riêng'),
    ).toBeVisible();
    await drawer.getByPlaceholder('ten@opchub.community').fill('kiem.soat@opchub.community');
    await drawer.getByRole('button', { name: 'Tạo tài khoản' }).click();
    await expect(toast(page)).toHaveText('Đã tạo tài khoản quản trị Trần Kiểm Soát');
    const row = table.getByRole('row').filter({ hasText: 'kiem.soat@opchub.community' });
    await expect(row).toContainText('Chưa bật');
    await expect(row.getByLabel('Vai trò của Trần Kiểm Soát').locator('option:checked')).toHaveText(
      'Kế toán',
    );
    await expect(page.getByText(/^7 tài khoản nội bộ/)).toBeVisible();

    await row.getByRole('button', { name: 'Khóa', exact: true }).click();
    await expect(dialog(page)).toContainText('Khóa tài khoản quản trị?');
    await dialog(page).getByRole('button', { name: 'Khóa', exact: true }).click();
    await expect(toast(page)).toHaveText('Đã khóa Trần Kiểm Soát');
    await expect(row).toContainText('Đã khóa');

    await row.getByRole('button', { name: 'Thu hồi' }).click();
    await expect(dialog(page)).toContainText('Thu hồi quyền quản trị?');
    await dialog(page).getByRole('button', { name: 'Thu hồi' }).click();
    await expect(toast(page)).toHaveText('Đã thu hồi quyền quản trị của Trần Kiểm Soát');
    await expect(page.getByText(/^6 tài khoản nội bộ/)).toBeVisible();

    await tab(page, 'Nhật ký hoạt động').click();
    // toast cùng chữ có thể còn trên màn → lấy dòng nhật ký (không phải role=status)
    await expect(
      page
        .getByText('thu hồi quyền quản trị của Trần Kiểm Soát')
        .and(page.locator(':not([role=status])'))
        .first(),
    ).toBeVisible();
    await expect(
      page.getByText('tạo tài khoản quản trị Trần Kiểm Soát (Kế toán)').first(),
    ).toBeVisible();
  });

  /**
   * D-63 TD-033: kiểm dòng nhật ký của thao tác vừa làm trong chính test — dòng seed có thể bị đẩy
   * khỏi 500 dòng mới nhất trên server (audit_logs chỉ INSERT, DV-B63-6) nên không dựa vào seed.
   */
  test('D-63 TD-033 nhật ký hiện thao tác vừa làm (tắt SSO DeepSeek)', async ({ page }) => {
    await openSettings(page);
    await tab(page, 'Đăng nhập & bảo mật').click();
    await page.getByRole('switch', { name: 'Bật/tắt DeepSeek' }).click();
    await expect(toast(page)).toHaveText('Đã tắt đăng nhập bằng DeepSeek');
    await tab(page, 'Nhật ký hoạt động').click();
    await expect(
      page
        .getByText('tắt đăng nhập bằng DeepSeek')
        .and(page.locator(':not([role=status])'))
        .first(),
    ).toBeVisible();
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
    // V2Q-117: demo/MSW mặc định TẮT để TK demo đăng nhập thẳng
    const tfa = page.getByRole('switch', { name: /Bắt buộc 2FA cho quản trị viên/ });
    await expect(tfa).toHaveAttribute('aria-checked', 'false');
    await tfa.click();
    await expect(tfa).toHaveAttribute('aria-checked', 'true');
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
