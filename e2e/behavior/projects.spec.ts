import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { PORTAL_URL } from '../urls';

/** G3b — P-55 → P-78: Dự án OPC (app mới, MSW) */

const SEARCH = 'Tìm dự án theo tên, mô tả hoặc chủ dự án...';

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });

async function login(page: Page) {
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

async function openProjects(page: Page) {
  await login(page);
  await page.locator('aside').getByText('Dự án OPC', { exact: true }).click();
  await expect(page.getByText('★ DỰ ÁN NỔI BẬT TUẦN')).toBeVisible();
}

async function openDetail(page: Page, name: string) {
  await openProjects(page);
  await page.getByText(name, { exact: true }).last().click();
  await expect(page.getByText('Giới thiệu dự án')).toBeVisible();
}

test.describe('Dự án OPC · khám phá', () => {
  test('lọc giai đoạn, sắp xếp, tìm kiếm — URL giữ trạng thái; rỗng → xoá bộ lọc', async ({
    page,
  }) => {
    await openProjects(page);
    await expect(page.getByText('6 / 6 dự án')).toBeVisible();

    await page.locator('select').first().selectOption({ label: 'MVP' });
    await expect(page.getByText('3 / 6 dự án')).toBeVisible();
    await expect(page).toHaveURL(/stage=mvp/);
    await page.locator('select').nth(1).selectOption({ label: 'Tên A–Z' });
    await expect(page).toHaveURL(/sort=name/);

    // quay lại từ chi tiết vẫn giữ bộ lọc (trạng thái nằm trên URL)
    await page.getByText('OPC Hub Mobile', { exact: true }).last().click();
    await expect(page.getByText('Giới thiệu dự án')).toBeVisible();
    await page.goBack();
    await expect(page.getByText('3 / 6 dự án')).toBeVisible();
    await expect(page.locator('select').first()).toHaveValue('mvp');

    await page.getByPlaceholder(SEARCH).fill('zzzz');
    await expect(page.getByText('Không tìm thấy dự án phù hợp')).toBeVisible();
    await page.getByRole('button', { name: 'Xoá bộ lọc' }).click();
    await expect(page.getByText('6 / 6 dự án')).toBeVisible();
  });

  test('dạng bảng: theo dõi / bỏ theo dõi cập nhật số liệu', async ({ page }) => {
    await openProjects(page);
    await page.getByTitle('Dạng bảng').click();
    await expect(page).toHaveURL(/view=table/);
    const row = page
      .locator('div')
      .filter({ hasText: /^SSoloBooks/ })
      .last();
    await row.getByRole('button', { name: '+ Theo dõi' }).click();
    await expect(toast(page)).toHaveText('Đang theo dõi SoloBooks');
    await expect(row.getByRole('button', { name: '✓ Đang theo dõi' })).toBeVisible();
    await row.getByRole('button', { name: '✓ Đang theo dõi' }).click();
    await expect(toast(page)).toHaveText('Đã bỏ theo dõi SoloBooks');
  });
});

test.describe('Dự án OPC · chi tiết', () => {
  test('URL riêng, chuyển tab giữ trên URL', async ({ page }) => {
    await openDetail(page, 'SoloBooks');
    await expect(page).toHaveURL(/\/projects\/p1/);
    await page.getByRole('tab', { name: 'Cập nhật' }).click();
    await expect(page.getByText('Ra mắt phiên bản 2.0')).toBeVisible();
    await expect(page).toHaveURL(/tab=updates/);
    await page.getByRole('tab', { name: 'Đội ngũ' }).click();
    await expect(page).toHaveURL(/tab=team/);
    await page.getByRole('tab', { name: 'Cập nhật' }).click();
    await expect(page).toHaveURL(/\/projects\/p1\?tab=updates/);
  });

  test('góp ý: gửi, trả lời', async ({ page }) => {
    await openDetail(page, 'BrandKit Mini');
    await page.getByRole('tab', { name: 'Góp ý (0)' }).click();
    await expect(page.getByText('Chưa có góp ý nào. Hãy là người đầu tiên!')).toBeVisible();

    const box = page.getByPlaceholder(/Chia sẻ góp ý của bạn/);
    await box.fill('ok');
    await page.getByRole('button', { name: 'Gửi góp ý' }).click();
    await expect(toast(page)).toHaveText('Nội dung góp ý quá ngắn');

    await box.fill('Bộ nhận diện rất đẹp, nên thêm mẫu cho ngành F&B.');
    await page.getByRole('button', { name: 'Gửi góp ý' }).click();
    await expect(toast(page)).toHaveText('Đã gửi góp ý cho BrandKit Mini');
    await expect(page.getByRole('tab', { name: 'Góp ý (1)' })).toBeVisible();

    await page.getByRole('button', { name: 'Trả lời' }).first().click();
    await page.getByPlaceholder('Viết trả lời...').fill('Cảm ơn bạn!');
    await page.getByRole('button', { name: 'Gửi', exact: true }).click();
    await expect(page.getByText('Cảm ơn bạn!')).toBeVisible();
  });

  test('repo riêng tư: gửi yêu cầu truy cập', async ({ page }) => {
    await openDetail(page, 'LeadPilot');
    await page.getByRole('button', { name: 'Yêu cầu quyền truy cập' }).click();
    await expect(toast(page)).toContainText('Đã gửi yêu cầu truy cập repository');
    await expect(page.getByText('✓ Đã gửi yêu cầu truy cập')).toBeVisible();
  });

  test('quan tâm đầu tư: kiểm tra dữ liệu, gửi kèm Idempotency-Key', async ({ page }) => {
    await openDetail(page, 'SoloBooks');
    await page.getByRole('button', { name: 'Quan tâm đầu tư' }).last().click();
    const dialog = page.getByRole('dialog', { name: 'Quan tâm đầu tư · SoloBooks' });
    await dialog.getByRole('button', { name: 'Gửi quan tâm' }).click();
    await expect(toast(page)).toHaveText('Số điện thoại không hợp lệ');

    await dialog.getByPlaceholder('+84 912 345 678').fill('0912345678');
    await dialog.getByPlaceholder('Tối thiểu 100 triệu ₫').fill('1000');
    await dialog.getByRole('button', { name: 'Gửi quan tâm' }).click();
    await expect(toast(page)).toHaveText('Số tiền tối thiểu là 100 triệu ₫');

    await dialog.getByPlaceholder('Tối thiểu 100 triệu ₫').fill('100000000');
    const req = page.waitForRequest(
      (r) => r.method() === 'POST' && /\/v1\/projects\/p1\/interest$/.test(r.url()),
    );
    await dialog.getByRole('button', { name: 'Gửi quan tâm' }).click();
    expect((await req).headers()['idempotency-key']).toBeTruthy();
    await expect(toast(page)).toHaveText('Đã gửi quan tâm đầu tư tới Trần Quốc Bảo');
    await expect(page.getByText(/✓ Đã gửi quan tâm/)).toBeVisible();
  });
});

test.describe('Dự án của tôi', () => {
  test('P-61: thành viên mới (SSO) chưa có dự án → trạng thái trống, mở form', async ({ page }) => {
    // prototype chỉ có TK demo đã sở hữu dự án; thành viên mới qua SSO (D-45) chưa có dự án nào
    await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Google/ }).click();
    await page.getByRole('button', { name: /^Cá nhân/ }).click();
    await page.getByRole('button', { name: /OPC Hà Nội/ }).click();
    await page.getByRole('button', { name: 'Hoàn tất và vào cộng đồng' }).click();
    await expect(page).toHaveURL(/\/community$/);
    await page
      .getByRole('dialog', { name: 'Đã gửi email chào mừng' })
      .getByRole('button', { name: 'Đóng' })
      .click();
    // D-28: TK mới chưa đóng phí nên popup Gói dịch vụ (G3a) phủ lên trang; màn bên dưới vẫn dựng
    // → bấm qua dispatchEvent (như membership.spec) để kiểm trạng thái trống của Dự án của tôi
    await page.locator('aside').getByText('Dự án OPC', { exact: true }).dispatchEvent('click');
    await page.getByRole('tab', { name: /Dự án của tôi/ }).dispatchEvent('click');
    await expect(page).toHaveURL(/\/projects\/mine/);
    await expect(page.getByRole('tab', { name: 'Dự án của tôi 0' })).toBeAttached();
    await expect(page.getByText('Bạn chưa có dự án nào')).toBeAttached();
    await page.getByRole('button', { name: '+ Đăng dự án đầu tiên' }).dispatchEvent('click');
    await expect(page.getByRole('dialog', { name: 'Đăng dự án mới' })).toBeAttached();
  });

  test('form: báo thiếu trường, lưu nháp rồi gửi duyệt', async ({ page }) => {
    await openProjects(page);
    await page.getByRole('button', { name: /Đăng dự án của bạn/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Đăng dự án mới' });
    await sheet.getByRole('button', { name: 'Gửi đăng dự án' }).click();
    await expect(toast(page)).toHaveText('Vui lòng nhập tên dự án');

    await sheet.getByPlaceholder('VD: SoloBooks – Kế toán cho OPC').fill('Dự án thử');
    await sheet.getByRole('button', { name: 'Lưu nháp' }).click();
    await expect(toast(page)).toHaveText('Đã lưu bản nháp');
    await expect(page).toHaveURL(/\/projects\/mine/);
    await expect(page.getByText('Bản nháp', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Chỉnh sửa' }).first().click();
    const edit = page.getByRole('dialog', { name: 'Chỉnh sửa dự án' });
    await edit.locator('select').first().selectOption({ label: 'Fintech' });
    await edit.getByPlaceholder('Một câu giới thiệu dự án của bạn').fill('Thử luồng gửi duyệt');
    await edit.getByRole('button', { name: 'Gửi đăng dự án' }).click();
    await expect(toast(page)).toHaveText(
      'Vui lòng nhập link bản test hợp lệ (bắt đầu bằng https://)',
    );
    await edit.getByPlaceholder('https://demo.duan-cua-ban.app').fill('https://demo.thu.app');
    await edit.getByRole('button', { name: 'Gửi đăng dự án' }).click();
    await expect(toast(page)).toHaveText(
      'Đã gửi dự án – quản trị viên sẽ duyệt trước khi hiển thị công khai',
    );
    await expect(page.getByText('Chờ duyệt', { exact: true })).toBeVisible();
  });

  test('chủ dự án thấy nhà đầu tư quan tâm; chia sẻ cần chọn nhóm', async ({ page }) => {
    await openProjects(page);
    await page.getByRole('tab', { name: /Dự án của tôi/ }).click();
    await page.getByRole('button', { name: 'Chia sẻ' }).first().click();
    const share = page.getByRole('dialog', { name: 'Chia sẻ “OPC Hub Mobile”' });
    await share.getByRole('button', { name: 'Chia sẻ', exact: true }).click();
    await expect(toast(page)).toHaveText('Chọn ít nhất 1 nhóm để chia sẻ');
    await share.getByText('OPC Hà Nội').click();
    await share.getByRole('button', { name: 'Chia sẻ', exact: true }).click();
    await expect(toast(page)).toHaveText('Đã chia sẻ OPC Hub Mobile tới 1 nhóm');

    await page.getByText('OPC Hub Mobile', { exact: true }).last().click();
    await expect(page.getByText('Nhà đầu tư quan tâm (2)')).toBeVisible();
  });
});
