import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { PORTAL_URL } from '../urls';
import { onServer, payFee } from '../server/api';
import { noisePng } from './png-fixture';

/** G3b — P-55 → P-78: Dự án OPC (app mới, MSW) */

/** D-89 (v4): ô tìm ở hero */
const SEARCH = 'Tìm dự án, giải pháp, địa phương, ngành nghề...';

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });

async function login(page: Page) {
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

async function openProjects(page: Page) {
  await login(page);
  await page.locator('aside').getByText('Dự án OPC', { exact: true }).click();
  await expect(page.getByText('Sáng kiến & Giải pháp cho địa phương')).toBeVisible();
}

async function openDetail(page: Page, name: string) {
  await openProjects(page);
  await page.getByText(name, { exact: true }).last().click();
  await expect(page.getByText('Giới thiệu dự án')).toBeVisible();
}

test.describe('Dự án OPC · khám phá', () => {
  test('D-89 bộ lọc trái v4, sắp xếp, cỡ trang, tìm kiếm — URL giữ trạng thái; rỗng → xoá bộ lọc', async ({
    page,
  }) => {
    await openProjects(page);
    const count = (n: number) => page.getByText(`${n} dự án`, { exact: true });
    await expect(count(11)).toBeVisible();
    // hero: 11 dự án công bố, 11 đơn vị, 40 kết nối (prototype v4)
    await expect(page.getByText('Kết nối thành công')).toBeVisible();

    const side = page.locator('aside').filter({ hasText: 'Bộ lọc' });
    await side.getByRole('checkbox', { name: /Có mô hình thử nghiệm/ }).click();
    await expect(count(4)).toBeVisible();
    await expect(page).toHaveURL(/devs=mvp/);
    await side.getByRole('checkbox', { name: /Sinh viên/ }).click();
    // MVP + Sinh viên: Chợ Freelance, Gốm Bát Tràng Online
    await expect(count(2)).toBeVisible();
    await expect(page).toHaveURL(/who=student/);
    await page.getByRole('combobox', { name: 'Sắp xếp' }).selectOption({ label: 'Nhiều lượt xem' });
    await expect(page).toHaveURL(/sort=view/);

    // quay lại từ chi tiết vẫn giữ bộ lọc (trạng thái nằm trên URL)
    await page.getByText('Chợ Freelance', { exact: true }).last().click();
    await expect(page.getByText('Giới thiệu dự án')).toBeVisible();
    await page.goBack();
    await expect(count(2)).toBeVisible();
    await expect(side.getByRole('checkbox', { name: /Sinh viên/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await side.getByRole('button', { name: '↻ Đặt lại' }).click();
    await expect(count(11)).toBeVisible();
    // nhóm ngành + địa phương tiêu biểu
    await page.getByRole('button', { name: 'Thủy sản', exact: true }).click();
    await expect(count(1)).toBeVisible();
    await page.getByRole('button', { name: 'Tất cả', exact: true }).click();
    await page.getByRole('button', { name: 'Đắk Lắk', exact: true }).click();
    await expect(count(2)).toBeVisible();
    await side.getByRole('button', { name: '↻ Đặt lại' }).click();

    // cỡ trang 8 → 2 trang
    await page.getByRole('combobox', { name: 'Số dự án mỗi trang' }).selectOption('8');
    await expect(page.getByText('Trang 1 / 2')).toBeVisible();
    await page.getByRole('button', { name: 'Sau ›' }).click();
    await expect(page.getByText('Trang 2 / 2')).toBeVisible();

    await page.getByPlaceholder(SEARCH).fill('zzzz');
    await expect(page.getByText('Không tìm thấy dự án phù hợp')).toBeVisible();
    await page.getByRole('button', { name: 'Xoá bộ lọc' }).click();
    await expect(count(11)).toBeVisible();
  });

  test('D-89 thẻ v4: huy hiệu Nổi bật / nhu cầu, tỉnh, lượt xem; tim theo dõi', async ({
    page,
  }) => {
    await openProjects(page);
    const first = page.locator('[role=link]').filter({ hasText: 'OPC Hub Mobile' });
    await expect(first.getByText('Nổi bật')).toBeVisible();
    await expect(first.getByText('Hà Nội')).toBeVisible();
    await expect(first.getByText('Có mô hình thử nghiệm')).toBeVisible();
    const third = page.locator('[role=link]').filter({ hasText: 'LeadPilot' });
    await expect(third.getByText('Tìm nhà đầu tư')).toBeVisible();
    // TK demo đang theo dõi LeadPilot (pjFollow) → tim đỏ; bấm = bỏ theo dõi
    const heart = third.getByRole('button', { name: 'Quan tâm' });
    await expect(heart).toHaveAttribute('aria-pressed', 'true');
    await heart.click();
    await expect(toast(page)).toHaveText('Đã bỏ theo dõi LeadPilot');
    await expect(heart).toHaveAttribute('aria-pressed', 'false');
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
    // D-89 (v4): mốc dự án (dữ liệu seed) rồi "Xuất bản trên OPC Hub" ở cuối
    await expect(page.getByText('Ra mắt phiên bản 2.0')).toBeVisible();
    await expect(page.getByText('Xuất bản trên OPC Hub')).toBeVisible();
    await expect(page.getByText('Tạo dự án')).toHaveCount(0);
    await expect(page).toHaveURL(/tab=updates/);
    await page.getByRole('tab', { name: 'Đội ngũ' }).click();
    await expect(page).toHaveURL(/tab=team/);
    await page.getByRole('tab', { name: 'Cập nhật' }).click();
    await expect(page).toHaveURL(/\/projects\/p1\?tab=updates/);
  });

  test('D-89 tab Tổng quan: điểm nổi bật + hình ảnh là dữ liệu của dự án (BUG-038)', async ({
    page,
  }) => {
    await openDetail(page, 'SoloBooks');
    await expect(page.getByText('Hình ảnh sản phẩm')).toBeVisible();
    await expect(page.getByText('Vấn đề', { exact: true })).toBeVisible();
    // ô "Giải pháp" = mô tả ngắn của chính dự án
    const sol = page.locator('div').filter({ has: page.getByText('Giải pháp', { exact: true }) });
    await expect(sol.last()).toContainText('Phần mềm kế toán tối giản');
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

  test('BUG-020 REQ-227 góp ý có thẻ HTML hiển thị chữ thuần', async ({ page }) => {
    await openDetail(page, 'SoloBooks');
    await page.getByRole('tab', { name: /^Góp ý \(\d+\)$/ }).click();
    const box = page.getByPlaceholder(/Chia sẻ góp ý của bạn/);
    const tag = `xss-${Date.now().toString(36)}`;
    await box.fill(
      `<b>Rất hay</b><script>window.__xss=1</script><img src=x onerror="window.__xss=2"> ${tag}`,
    );
    const posted = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/v1\/projects\/[^/]+\/comments$/.test(r.url()),
    );
    await page.getByRole('button', { name: 'Gửi góp ý' }).click();
    const res = await posted;
    expect(res.status()).toBe(201);
    expect(((await res.json()) as { body: string }).body).toBe(`Rất hay ${tag}`);
    await expect(page.getByText(`Rất hay ${tag}`, { exact: true })).toBeVisible();
    await expect(page.getByText('<b>', { exact: false })).toHaveCount(0);
    expect(await page.evaluate(() => (window as { __xss?: number }).__xss)).toBeUndefined();
  });

  test('BUG-021 QT-09 liên hệ chủ dự án Email/Zalo/Gọi, không còn Nhắn tin', async ({ page }) => {
    await openDetail(page, 'SoloBooks');
    // Kênh chủ dự án tự công khai (seed: email + SĐT mẫu của Trần Quốc Bảo)
    const owner = page.locator('section').filter({ hasText: 'Chủ dự án ·' });
    await expect(owner.getByRole('link', { name: 'Email', exact: true })).toHaveAttribute(
      'href',
      /^mailto:.+@opchub\.vn$/,
    );
    await expect(owner.getByRole('link', { name: 'Zalo', exact: true })).toHaveAttribute(
      'href',
      /^https:\/\/zalo\.me\/09\d{8}$/,
    );
    await expect(owner.getByRole('link', { name: 'Gọi', exact: true })).toHaveAttribute(
      'href',
      /^tel:09\d{8}$/,
    );
    await expect(page.getByRole('button', { name: 'Nhắn tin', exact: true })).toHaveCount(0);
    // D-89 (v4): địa chỉ liên hệ chủ dự án tự công khai trên dự án (không lấy từ hồ sơ TK)
    await expect(page.getByText('Địa chỉ', { exact: true })).toBeVisible();
    await expect(page.getByText('210 Nguyễn Văn Linh, Q. Ninh Kiều, Cần Thơ')).toBeVisible();
  });

  test('BUG-016 QT-09 form có Liên hệ công khai: điền sẵn từ hồ sơ, xoá được, SĐT sai báo tại ô', async ({
    page,
  }) => {
    await openProjects(page);
    await page.getByRole('button', { name: /Đăng dự án của bạn/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Đăng dự án mới' });
    await expect(sheet.getByText('Liên hệ công khai', { exact: true })).toBeVisible();
    const email = sheet.getByLabel('Email liên hệ');
    const phone = sheet.getByLabel('SĐT Zalo / Gọi');
    await expect(email).toHaveValue('an.nguyen@mediasoft.vn');
    await phone.fill('abc');
    await sheet.getByPlaceholder('VD: SoloBooks – Kế toán cho OPC').fill('Dự án thử liên hệ');
    await sheet.getByRole('button', { name: 'Lưu nháp' }).click();
    await expect(toast(page)).toHaveText('Số điện thoại liên hệ không hợp lệ');
    await expect(phone).toHaveAttribute('aria-invalid', 'true');
    // Xoá hết → không công khai; lưu được
    await email.fill('');
    await phone.fill('');
    await sheet.getByRole('button', { name: 'Lưu nháp' }).click();
    await expect(toast(page)).toHaveText('Đã lưu bản nháp');
  });

  test('repo riêng tư: gửi yêu cầu truy cập', async ({ page }) => {
    await openDetail(page, 'LeadPilot');
    await page.getByRole('button', { name: 'Yêu cầu quyền truy cập' }).click();
    await expect(toast(page)).toContainText('Đã gửi yêu cầu truy cập repository');
    await expect(page.getByText('✓ Đã gửi yêu cầu truy cập')).toBeVisible();
  });

  test('quan tâm đầu tư: kiểm tra dữ liệu, gửi kèm Idempotency-Key', async ({ page }) => {
    await openDetail(page, 'SoloBooks');
    // V4-610: khối gọi vốn nằm ở tab "Gọi vốn đầu tư" (chỉ khi Gói Gọi vốn đang hiệu lực)
    await page.getByRole('tab', { name: 'Gọi vốn đầu tư' }).click();
    await expect(page).toHaveURL(/tab=fund/);
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
    await page.getByText(/^Tôi xác nhận là người đại diện hợp pháp/).click();
    await page.getByRole('button', { name: 'Hoàn tất và vào cộng đồng' }).click();
    await expect(page).toHaveURL(/\/community$/);
    await page
      .getByRole('dialog', { name: 'Đã gửi email chào mừng' })
      .getByRole('button', { name: 'Đóng' })
      .click();
    // D-28: TK mới chưa đóng phí nên popup Gói dịch vụ (G3a) phủ lên trang; màn bên dưới vẫn dựng
    // → bấm qua dispatchEvent (như membership.spec) để kiểm trạng thái trống của Dự án của tôi
    // Q-B62-20: API thật chặn /me/projects khi chưa đóng phí → TK SSO mới đóng phí trước
    if (onServer) await payFee(page);
    await page.locator('aside').getByText('Dự án OPC', { exact: true }).dispatchEvent('click');
    await page.getByRole('tab', { name: /Dự án của tôi/ }).dispatchEvent('click');
    await expect(page).toHaveURL(/\/projects\/mine/);
    await expect(page.getByRole('tab', { name: 'Dự án của tôi 0' })).toBeAttached();
    await expect(page.getByText('Bạn chưa có dự án nào')).toBeAttached();
    await page.getByRole('button', { name: '+ Đăng dự án đầu tiên' }).dispatchEvent('click');
    await expect(page.getByRole('dialog', { name: 'Đăng dự án mới' })).toBeAttached();
  });

  test('REQ-106 D-18 sửa dự án đang hiển thị → bản sửa chờ duyệt, bản công khai giữ nguyên', async ({
    page,
  }) => {
    await openProjects(page);
    await page.getByRole('tab', { name: /Dự án của tôi/ }).click();
    await expect(page).toHaveURL(/\/projects\/mine/);
    const row = page.locator('[role=link]').filter({ hasText: 'OPC Hub Mobile' });
    await row.getByRole('button', { name: 'Chỉnh sửa' }).click();
    const edit = page.getByRole('dialog', { name: 'Chỉnh sửa dự án' });
    await edit.getByPlaceholder('VD: SoloBooks – Kế toán cho OPC').fill('OPC Hub Mobile 2');
    await edit.getByRole('button', { name: 'Gửi đăng dự án' }).click();
    await expect(toast(page)).toHaveText(
      'Đã gửi bản sửa – bản đang hiển thị giữ nguyên tới khi quản trị viên duyệt',
    );
    // V4-610 (prototype `fundSt`): dự án có gọi vốn chưa mua gói có phí → popup thanh toán
    const fund = page.getByRole('dialog', { name: 'Thanh toán Gói Gọi vốn' });
    await fund.getByRole('button', { name: 'Để sau' }).click();
    await expect(fund).toBeHidden();
    await expect(row).toContainText('Đang hiển thị · Bản sửa chờ duyệt');
    await expect(row).toContainText('OPC Hub Mobile');
    await expect(row).not.toContainText('OPC Hub Mobile 2');
    // Trang công khai vẫn bản đang hiển thị
    await row.click();
    await expect(page).toHaveURL(/\/projects\/p10/);
    await expect(page.getByText('Giới thiệu dự án')).toBeVisible();
    await expect(page.getByText('OPC Hub Mobile 2')).toHaveCount(0);
    // Sửa tiếp: form mở nội dung bản sửa
    await page.goBack();
    await expect(page).toHaveURL(/\/projects\/mine/);
    await row.getByRole('button', { name: 'Chỉnh sửa' }).click();
    await expect(edit.getByPlaceholder('VD: SoloBooks – Kế toán cho OPC')).toHaveValue(
      'OPC Hub Mobile 2',
    );
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
    await edit
      .getByRole('combobox', { name: /Nhóm ngành giải pháp/ })
      .selectOption({ label: 'Thủy sản' });
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

  test('BUG-002 REQ-226 dự án có ảnh bìa', async ({ page }) => {
    await openProjects(page);
    await page.getByRole('button', { name: /Đăng dự án của bạn/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Đăng dự án mới' });
    const cover = sheet.locator('input[type=file]').first();
    // NA-26: > 5 MB bị từ chối tại ô, giữ trống
    await cover.setInputFiles({
      name: 'to.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(6 * 1024 * 1024),
    });
    await expect(toast(page)).toHaveText('Ảnh phải là PNG, JPG hoặc WebP, tối đa 5MB');
    await expect(sheet.getByRole('button', { name: 'Gỡ ảnh' })).toHaveCount(0);

    await cover.setInputFiles(noisePng(300 * 1024));
    await expect(sheet.getByRole('button', { name: 'Gỡ ảnh' })).toBeVisible();
    await sheet.getByPlaceholder('VD: SoloBooks – Kế toán cho OPC').fill('Dự án có ảnh bìa');
    const saved = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/v1\/projects$/.test(r.url()),
    );
    await sheet.getByRole('button', { name: 'Lưu nháp' }).click();
    const res = await saved;
    expect(res.status()).toBe(201);
    const body = res.request().postDataJSON() as { coverUrl: string | null };
    expect(body.coverUrl).toMatch(/\/v1\/uploads\//);
    await expect(toast(page)).toHaveText('Đã lưu bản nháp');
    await expect(page).toHaveURL(/\/projects\/mine/);
    const img = page.locator(`img[src="${body.coverUrl ?? ''}"]`).first();
    await expect(img).toBeVisible();
    await expect
      .poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
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
    await page.getByRole('tab', { name: 'Gọi vốn đầu tư' }).click();
    await expect(page.getByText('Nhà đầu tư quan tâm (2)')).toBeVisible();
  });
});
