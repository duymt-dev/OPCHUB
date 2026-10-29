import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { PORTAL_URL } from '../urls';
import { onServer, pageFetch, setGroupOwner } from '../server/api';
import { noisePng } from './png-fixture';

/** G2c — Chat nhóm P-28 → P-48 trên app mới (MSW) */

const MSG = 'Chào cả nhà, tuần này ai đi Meetup #12 không? Mình đang gom nhóm đi chung.';

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });

async function openChat(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.locator('aside').getByText('Chat nhóm', { exact: true }).click();
  await expect(page.getByText('Enter để gửi')).toBeVisible();
}

const composer = (page: Page) => page.getByPlaceholder(/^Nhắn tin trong #/);

test.describe('Chat nhóm', () => {
  test('đổi chủ đề, đổi nhóm, URL theo phòng', async ({ page }) => {
    await openChat(page);
    await expect(page).toHaveURL(/\/chat$/);
    await page.getByText('Hỏi đáp thuế & pháp lý', { exact: true }).click();
    await expect(page).toHaveURL(/\/chat\/c1\/qa/);
    await expect(composer(page)).toHaveAttribute(
      'placeholder',
      'Nhắn tin trong #Hỏi đáp thuế & pháp lý...',
    );
    await page.locator('[title="OPC TP. Hồ Chí Minh"]').click();
    await expect(page).toHaveURL(/\/chat\/c2/);
    await expect(page.getByText('Workflow của mình đây', { exact: false }).last()).toBeVisible();
  });

  test('REQ-209 NA-09 D-61 không có nút tạo/xoá chủ đề; chủ đề "do Admin tạo"; API tạo → 404', async ({
    page,
  }) => {
    await openChat(page);
    await expect(page.getByText('CHỦ ĐỀ THẢO LUẬN')).toBeVisible();
    await expect(page.getByText('do Admin tạo')).toBeVisible();
    await expect(page.locator('[title="Tạo chủ đề mới"]')).toHaveCount(0);
    await expect(page.locator('[title="Xoá chủ đề của bạn"]')).toHaveCount(0);
    const status = await page.evaluate(async () => {
      // API thật cần token (lấy qua refresh cookie); MSW không có route refresh → gửi không token
      const auth = await fetch('/v1/auth/refresh', { method: 'POST', credentials: 'include' });
      const token = auth.ok ? ((await auth.json()) as { accessToken: string }).accessToken : '';
      const r = await fetch('/v1/groups/c1/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: 'Test' }),
      });
      return r.status;
    });
    expect(status).toBe(404);
  });

  test('AT-GR01 GR-R02 REQ-362 panel thành viên có nhãn Giảng viên', async ({ page }) => {
    await openChat(page);
    const panel = page.getByRole('tabpanel');
    await expect(panel.getByText('Giảng viên', { exact: true }).first()).toBeVisible();
    await expect(panel.getByText('Điều phối', { exact: true })).toHaveCount(0);
  });

  test('gửi chữ / ảnh thật, nhắc tên có gợi ý', async ({ page }) => {
    await openChat(page);
    await composer(page).fill('Xin chào');
    await composer(page).press('Enter');
    await expect(page.getByText('Xin chào', { exact: true })).toBeVisible();
    const img = noisePng(40 * 1024, 'anh-tai-len.png');
    await page.locator('input[data-attach=image]').setInputFiles(img);
    await expect(page.locator('img[alt="anh-tai-len.png"]')).toBeVisible();

    await page.locator('[title="Nhắc tên"]').click();
    await expect(page.getByText('Nhắc tên thành viên')).toBeVisible();
    await page.getByRole('button', { name: /^Lê Minh Anh CEO/ }).click();
    await expect(composer(page)).toHaveValue('@Lê Minh Anh ');
    await composer(page).press('Enter');
    await expect(toast(page)).toHaveText('Đã nhắc Lê Minh Anh');
  });

  test('BUG-010 QT-06 đính kèm tệp thật qua hộp chọn tệp → link tải đúng tệp', async ({ page }) => {
    await openChat(page);
    const presigns: string[] = [];
    page.on('request', (r) => {
      if (r.method() === 'POST' && /\/v1\/uploads\/presign$/.test(r.url())) presigns.push(r.url());
    });
    // NA-26: ảnh 6 MB → toast lỗi, không gọi presign
    const big = { name: 'to.png', mimeType: 'image/png', buffer: Buffer.alloc(6 * 1024 * 1024, 1) };
    await page.locator('input[data-attach=image]').setInputFiles(big);
    await expect(toast(page)).toHaveText('Ảnh phải là PNG/JPEG/WEBP, tối đa 5MB');
    expect(presigns).toHaveLength(0);

    const pdf = Buffer.concat([Buffer.from('%PDF-1.4 '), Buffer.alloc(300 * 1024 - 9, 32)]);
    // Gửi qua transport (REST ở MSW, socket ở server) → chờ thẻ tệp hiện trong phòng
    await page
      .locator('input[data-attach=file]')
      .setInputFiles({ name: 'bao-cao.pdf', mimeType: 'application/pdf', buffer: pdf });
    const row = page
      .locator('div')
      .filter({ hasText: /^PDFbao-cao\.pdf300 KB/ })
      .last();
    await expect(row).toBeVisible();
    expect(presigns).toHaveLength(1);
    const link = row.getByRole('link', { name: 'Tải về' });
    const href = await link.getAttribute('href');
    expect(href).toBeTruthy();
    // Người trong phòng tải được đúng tệp từ storage
    const got = await page.evaluate(async (u) => {
      const r = await fetch(u);
      return { ok: r.ok, size: (await r.arrayBuffer()).byteLength };
    }, href ?? '');
    expect(got).toEqual({ ok: true, size: 300 * 1024 });
    // D-117 B6: bấm Tải về → xin link ký mới của tin (GET /messages/:id/attachment) rồi mở tab mới
    const fresh = page.waitForResponse(
      (r) => r.request().method() === 'GET' && /\/v1\/messages\/[^/]+\/attachment$/.test(r.url()),
    );
    const popup = page.waitForEvent('popup');
    await link.click();
    expect((await fresh).status()).toBe(200);
    await (await popup).close();
    // D-98: tab "File chia sẻ" theo nhóm thấy tệp vừa gửi, "Tải về" xin link ký mới
    await page.getByRole('tab', { name: 'File chia sẻ' }).click();
    const shared = page.getByTestId('group-file').filter({ hasText: 'bao-cao.pdf' });
    await expect(shared).toBeVisible();
    const again = page.waitForResponse(
      (r) => r.request().method() === 'GET' && /\/v1\/messages\/[^/]+\/attachment$/.test(r.url()),
    );
    const popup2 = page.waitForEvent('popup');
    await shared.getByRole('link', { name: 'Tải về' }).click();
    expect((await again).status()).toBe(200);
    await (await popup2).close();
  });

  test('chọn tin: cảm xúc, trả lời, ghim / bỏ ghim', async ({ page }) => {
    await openChat(page);
    const msg = page.getByText(MSG, { exact: true }).last();
    await msg.click();
    await page.getByRole('button', { name: '😮' }).click();
    await expect(page.getByRole('button', { name: '😮 1' })).toBeVisible();

    await msg.click();
    await page.getByRole('button', { name: 'Trả lời', exact: true }).click();
    await expect(page.getByText('Trả lời Lê Minh Anh')).toBeVisible();
    await composer(page).fill('Mình đi nhé');
    await composer(page).press('Enter');
    await expect(page.getByText('Trả lời Lê Minh Anh')).toHaveCount(0);
    await expect(page.getByText('Mình đi nhé', { exact: true })).toBeVisible();

    await page.getByText(/^1 tin đã ghim/).click();
    await page.getByRole('button', { name: 'Bỏ ghim' }).first().click();
    await expect(toast(page)).toHaveText('Đã bỏ ghim');
    await expect(page.getByText(/tin đã ghim/)).toHaveCount(0);
  });

  test('tìm trong phòng ghi ?q=, đếm kết quả, Đóng', async ({ page }) => {
    await openChat(page);
    await page.locator('[title="Tìm trong phòng"]').click();
    await page.getByPlaceholder('Tìm tin nhắn trong phòng này...').fill('Meetup');
    await expect(page).toHaveURL(/q=Meetup/);
    await expect(page.getByText('1 kết quả')).toBeVisible();
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
    await expect(page).not.toHaveURL(/q=/);
  });

  test('D-71 bảng thông tin: chủ nhóm không còn mục duyệt; tab File chia sẻ / Đã ghim', async ({
    page,
  }) => {
    await openChat(page);
    await expect(page.getByText('Bạn là chủ nhóm')).toBeVisible();
    await expect(page.getByText('Chờ duyệt vào nhóm')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Duyệt', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Từ chối' })).toHaveCount(0);

    await page.getByRole('tab', { name: 'Đã ghim (1)' }).click();
    await expect(page.getByRole('tabpanel').getByText('Lê Minh Anh')).toBeVisible();

    // D-98 / §27.7: file + ảnh mọi chủ đề của nhóm, chip đếm toàn bộ, tìm theo tên / người gửi, mở chủ đề gốc
    await page.getByRole('tab', { name: 'File chia sẻ' }).click();
    await expect(page).toHaveURL(/panel=files/);
    const panel = page.getByRole('tabpanel');
    await expect(panel).toContainText(
      'File & hình ảnh thành viên chia sẻ trong mọi chủ đề của OPC Hà Nội. Chỉ thành viên trong nhóm xem được.',
    );
    await expect(panel.getByTestId('group-file')).toHaveCount(3);
    await expect(panel.getByRole('button', { name: 'Tất cả · 3' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await panel.getByRole('button', { name: 'Hình ảnh · 0' }).click();
    await expect(panel.getByText(/^Chưa có file phù hợp\./)).toBeVisible();
    await panel.getByRole('button', { name: 'Tài liệu · 3' }).click();
    await panel.getByPlaceholder('Tìm theo tên file hoặc người gửi').fill('vu duc');
    await expect(panel.getByTestId('group-file')).toHaveCount(1);
    const row = panel.getByTestId('group-file').first();
    await expect(row).toContainText('Mau-hop-dong-dich-vu.docx');
    await expect(row).toContainText('96 KB · Vũ Đức Long');
    await row.getByRole('button', { name: '# Chia sẻ mẫu biểu' }).click();
    await expect(page).toHaveURL(/\/chat\/c1\/docs/);
    await expect(page.getByPlaceholder('Nhắn tin trong #Chia sẻ mẫu biểu...')).toBeVisible();
    await page.locator('[title="Ẩn bảng thông tin"]').click();
    await expect(page.getByRole('tablist')).toHaveCount(0);
  });

  test('báo cáo tin: bắt chọn lý do, gửi xong ẩn tin + gắn nhãn (V4-612)', async ({ page }) => {
    await openChat(page);
    await page.getByText(MSG, { exact: true }).last().click();
    await page.getByRole('button', { name: 'Báo cáo', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Báo cáo tin nhắn' });
    await dialog.getByRole('button', { name: 'Gửi báo cáo' }).click();
    await expect(toast(page)).toHaveText('Vui lòng chọn lý do');
    await dialog.getByRole('radio', { name: 'Lừa đảo' }).click();
    await dialog.getByRole('button', { name: 'Gửi báo cáo' }).click();
    await expect(toast(page)).toHaveText('Đã báo cáo – tin nhắn đã được ẩn khỏi phòng chat');
    await expect(page.getByText('Bạn đã báo cáo tin này')).toBeVisible();
    // D-77: dòng tin giữ chỗ bằng câu thông báo, nội dung gốc không còn trong luồng tin
    await expect(
      page.getByText('Tin nhắn đã bị ẩn do vi phạm nội quy cộng đồng.').first(),
    ).toBeVisible();
    await expect(page.locator('[role="option"]').filter({ hasText: MSG })).toHaveCount(0);
  });

  test('AT-NR01 xem trước nhóm chưa tham gia (v4: không ô đồng ý) → form tham gia → đồng ý phí → vào nhóm', async ({
    page,
  }) => {
    await openChat(page);
    await page.locator('[title="OPC Đà Nẵng"]').click();
    await expect(page.getByText(/Bạn chưa là thành viên của nhóm này/)).toBeVisible();
    await expect(page.getByText(/không hoàn lại sau khi thanh toán/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Để sau' }).click();
    await expect(page.getByText(/Bạn chưa là thành viên/)).toHaveCount(0);
    await page.locator('[title="OPC Đà Nẵng"]').click();
    await page.getByRole('button', { name: 'Tham gia nhóm' }).click();
    // NR-R02: form tham gia ở Cộng đồng giữ ô đồng ý nội quy + phí không hoàn lại
    await expect(page).toHaveURL(/\/community\?join=c3/);
    const dialog = page.getByRole('dialog', { name: 'OPC Đà Nẵng' });
    await dialog.getByRole('button', { name: 'Tham gia ngay' }).click();
    await expect(toast(page)).toHaveText('Vui lòng đồng ý nội quy cộng đồng');
    await dialog.getByText(/không hoàn lại sau khi thanh toán/).click();
    await dialog.getByRole('button', { name: 'Tham gia ngay' }).click();
    await expect(toast(page)).toHaveText('Chào mừng bạn đến với OPC Đà Nẵng!');
  });

  test('D-71 xem trước nhóm trước đây "Cần duyệt" (Hải Phòng): tham gia ngay tại chỗ', async ({
    page,
  }) => {
    await openChat(page);
    await page.locator('[title="OPC Hải Phòng"]').click();
    await expect(page.getByText('Cần duyệt', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Gửi yêu cầu tham gia' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Tham gia nhóm' }).click();
    const dialog = page.getByRole('dialog', { name: 'OPC Hải Phòng' });
    await dialog.getByText(/không hoàn lại sau khi thanh toán/).click();
    await dialog.getByRole('button', { name: 'Tham gia ngay' }).click();
    await expect(toast(page)).toHaveText('Chào mừng bạn đến với OPC Hải Phòng!');
  });

  test('+ Tham gia thêm nhóm → /community', async ({ page }) => {
    await openChat(page);
    await page.locator('[title="Tham gia thêm nhóm"]').click();
    await expect(page).toHaveURL(/\/community$/);
  });

  test('chưa tham gia nhóm nào → chỉ thành viên mới xem được', async ({ page }) => {
    await openChat(page);
    await page.locator('aside').getByText('Dashboard', { exact: true }).click();
    if (onServer) {
      // D-43 / Q-B20-1: chủ nhóm không tự rời → Admin chuyển chủ c1, c6 trước; gọi API kèm token
      await setGroupOwner('c1', 'm2');
      await setGroupOwner('c6', 'm8');
      for (const g of ['c1', 'c2', 'c6']) await pageFetch(page, `/groups/${g}/join`, 'DELETE');
    } else {
      await page.evaluate(async () => {
        for (const g of ['c1', 'c2', 'c6']) {
          await fetch(`/v1/groups/${g}/join`, { method: 'DELETE' });
        }
      });
    }
    await page.locator('aside').getByText('Chat nhóm', { exact: true }).click();
    await expect(page.getByText('Chỉ thành viên nhóm mới xem và gửi được tin nhắn.')).toBeVisible();
    await expect(page.getByText(/^Bạn chưa tham gia nhóm nào/)).toBeVisible();
    await expect(page.getByText('90 nhóm')).toBeVisible();
  });
});
