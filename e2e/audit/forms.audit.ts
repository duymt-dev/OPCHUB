import { verifyAccountLock } from './checks/account-lock';
import { verifyHiddenMessage } from './checks/hide-message';
import { test, type Page } from '@playwright/test';
import {
  ADMIN,
  ADMIN_URL,
  API,
  api,
  apiLogin,
  finding,
  login,
  pngOfSize,
  PORTAL_URL,
  record,
  resetDemo,
  sql,
  USER,
} from './lib';

/**
 * AUDIT-W1 · dùng thử form theo đặc tả (§6 "báo lỗi tại trường") + biên + luồng chéo vai trò.
 * Mỗi kiểm ghi `record('screens', …)` với kết quả và finding khi lệch đặc tả. Không dừng ở lỗi.
 */

async function check(
  page: Page | null,
  key: string,
  area: string,
  screen: string,
  sev: 'S1' | 'S2' | 'S3' | 'S4',
  title: string,
  expected: string,
  fn: () => Promise<string | null>,
) {
  let actual: string | null = null;
  try {
    actual = await fn();
  } catch (e) {
    actual = `lỗi khi kiểm: ${e instanceof Error ? (e.message.split('\n')[0] ?? '') : String(e)}`;
  }
  record('screens', {
    id: key,
    name: `${screen} · ${title}`,
    result: actual ? 'CÓ VẤN ĐỀ' : 'OK',
    note: actual ?? '',
  });
  if (actual)
    await finding(page, test.info(), {
      key,
      area,
      screen,
      sev,
      title,
      expected,
      actual: actual.slice(0, 600),
    });
}

/** Sau khi bấm gửi form trống: có ô nào được đánh dấu lỗi tại chỗ không? */
async function fieldErrors(page: Page, scope: ReturnType<Page['getByRole']>) {
  const invalid = await scope.locator('[aria-invalid="true"]').count();
  const inline = await scope
    .locator('[role=alert], .ant-form-item-explain-error, [id$="-error"]')
    .filter({ visible: true })
    .count();
  const toasts = await page.getByRole('status').filter({ visible: true }).allInnerTexts();
  return { invalid, inline, toasts };
}

test.describe.configure({ mode: 'serial' });
test.beforeAll(() => resetDemo());

test('Admin form trống: tạo sự kiện / tạo nhóm', async ({ page }) => {
  await login(page, ADMIN_URL, ADMIN);
  for (const [path, open, submit, title] of [
    ['events', /^\+?\s*Tạo sự kiện$/, 'Lưu sự kiện', 'Tạo sự kiện'],
    ['groups', /Tạo nhóm/, 'Tạo nhóm', 'Tạo nhóm'],
  ] as const) {
    await page.goto(`${ADMIN_URL}/${path}`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: open }).first().click();
    const dlg = page.getByRole('dialog');
    await dlg.getByRole('button', { name: submit, exact: true }).click();
    await page.waitForTimeout(400);
    const r = await fieldErrors(page, dlg);
    await check(
      page,
      `form-empty-${path}`,
      'Admin',
      title,
      'S3',
      'Bỏ trống trường bắt buộc chỉ báo bằng toast, không báo tại ô',
      'Đặc tả §6: "báo lỗi tại trường"; mọi ô thiếu được đánh dấu cùng lúc',
      () =>
        Promise.resolve(
          r.invalid === 0 && r.inline === 0
            ? `Không ô nào aria-invalid / thông báo dưới ô; chỉ toast: ${r.toasts.join(' / ')} (một lỗi đầu tiên, toast ở đáy giữa trang, đè mép form, tự tắt)`
            : null,
        ),
    );
    await page.keyboard.press('Escape');
  }
});

test('Ảnh bìa: data URL bị từ chối, ảnh đi qua presign (TIP-V2-102, TD-014)', async ({ page }) => {
  const t = await apiLogin(ADMIN);
  for (const kb of [90, 300, 1500]) {
    const dataUrl = `data:image/png;base64,${pngOfSize(kb * 1024 * 0.74).toString('base64')}`;
    const r = await api('/admin/events', t, {
      method: 'POST',
      body: {
        title: `Audit ảnh ${kb}KB`,
        mode: 'online',
        startsAt: '2026-12-20T02:00:00.000Z',
        place: 'https://meet.example.com/a',
        seats: 20,
        description: 'Mô tả',
        coverUrl: dataUrl,
      },
    });
    if (r.status < 300)
      await api(`/admin/events/${(r.json as { id: string }).id}`, t, { method: 'DELETE' });
    await check(
      null,
      `cover-${kb}kb`,
      'Admin',
      'Tạo sự kiện · ảnh bìa',
      'S1',
      `Ảnh bìa data URL ~${kb}KB (body ~${Math.round(dataUrl.length / 1024)}KB)`,
      'TIP-V2-102: coverUrl không nhận data URL → 400 (vừa giới hạn body) hoặc 413 PAYLOAD_TOO_LARGE; không bao giờ 2xx/500',
      () =>
        Promise.resolve(
          r.status === 400 || r.status === 413
            ? null
            : `HTTP ${r.status} ${JSON.stringify(r.json).slice(0, 160)}`,
        ),
    );
  }
  // FE thật: chọn file ảnh 300KB trên form tạo nhóm
  await login(page, ADMIN_URL, ADMIN);
  await page.goto(`${ADMIN_URL}/events`, { waitUntil: 'networkidle' });
  await page
    .getByRole('button', { name: /^\+?\s*Tạo sự kiện$/ })
    .first()
    .click();
  const dlg = page.getByRole('dialog');
  await dlg
    .locator('input[type=file]')
    .first()
    .setInputFiles({ name: 'bia.png', mimeType: 'image/png', buffer: pngOfSize(300 * 1024) });
  await dlg.getByPlaceholder('VD: OPC Meetup #13').fill('Audit sự kiện có ảnh');
  const hinh = dlg.getByText('Online', { exact: true });
  if (await hinh.count()) await hinh.first().click();
  const link = dlg.getByPlaceholder('https://zoom.us/j/...');
  if (await link.count()) await link.fill('https://zoom.us/j/1');
  const date = dlg.locator('input[type=date]').first();
  if (await date.count()) await date.fill('2026-12-20');
  const statuses: number[] = [];
  page.on('response', (r) => {
    if (/\/v1\/admin\/events$/.test(r.url()) && r.request().method() === 'POST')
      statuses.push(r.status());
  });
  await dlg.getByRole('button', { name: 'Lưu sự kiện', exact: true }).click();
  await page.waitForTimeout(2500);
  const toast = await page.getByRole('status').filter({ visible: true }).allInnerTexts();
  await check(
    page,
    'cover-ui-event',
    'Admin',
    'Tạo sự kiện (UI) · ảnh 300KB',
    'S1',
    'Lưu sự kiện có ảnh bìa 300KB qua UI',
    'Lưu thành công',
    () =>
      Promise.resolve(
        statuses.some((s) => s >= 400)
          ? `POST /admin/events → ${statuses.join(',')}; toast: ${toast.join(' / ')}`
          : null,
      ),
  );
});

test('D-15 public project access and group ownership after account lock', async () => {
  await check(
    null,
    'd15-lock-effects',
    'Cross-role',
    'Admin lock -> Portal',
    'S2',
    'D-15 lock effects',
    'Public access revoked and group ownership handed off',
    verifyAccountLock,
  );
});

test('Đặt lại mật khẩu: link trong mail', async ({ page }) => {
  await check(
    page,
    'reset-link-404',
    'Portal',
    'Quên mật khẩu → mail → /reset-password',
    'S1',
    'Link đặt lại mật khẩu trong mail mở trang 404',
    'QT-02: liên kết 15 phút đặt lại mật khẩu, thu hồi mọi phiên',
    async () => {
      // thành viên demo khác (giới hạn 3 lần/giờ/email đã dùng ở UAT-11)
      const who =
        sql(
          `select email from users where status='active' and deleted_at is null and system_role='member' and email like '%@%' and email <> '${USER.email}' and id not like 'load-%' order by email limit 1`,
        )[0]?.[0] ?? USER.email;
      const f = await api('/auth/password/forgot', null, { method: 'POST', body: { email: who } });
      if (f.status >= 300)
        return `POST /auth/password/forgot → ${f.status} ${JSON.stringify(f.json).slice(0, 120)}`;
      await new Promise((res) => setTimeout(res, 4000));
      // mail_logs.body_html bị xoá sau khi gửi (không lưu token) + FakeMail giữ thư trong RAM worker
      // → không lấy được link thật; kiểm đường dẫn link server sinh (PORTAL_URL/reset-password?token=)
      const sent = sql(
        `select status from mail_logs where "to"='${who}' and kind='password_reset' order by created_at desc limit 1`,
      )[0]?.[0];
      if (!sent) return 'không có mail password_reset';
      const res = await page.goto(`${PORTAL_URL}/reset-password?token=audit`, {
        waitUntil: 'load',
      });
      return res?.status() === 200
        ? null
        : `GET /reset-password?token=*** → ${res?.status()} (Portal không có route này)`;
    },
  );
});

test('Gửi 2 lần (double submit) + chuỗi dài / ký tự đặc biệt', async ({ page }) => {
  const tu = await apiLogin(USER);
  const t = await apiLogin(ADMIN);
  await check(
    null,
    'double-submit-service',
    'Portal',
    'Đăng ký tư vấn',
    'S3',
    'Gửi 2 lần cùng Idempotency-Key',
    'Chỉ tạo 1 phiếu YC',
    async () => {
      const svc = sql(`select id from services where enabled limit 1`)[0]?.[0];
      const key = `audit-dup-${Date.now()}`;
      const body = JSON.stringify({
        serviceId: svc,
        requesterType: 'personal',
        fullName: 'Audit Dup',
        phone: '0912345678',
        email: 'dup@audit.vn',
        address: 'Hà Nội',
        note: 'Cần tư vấn',
        details: { 'Nghề nghiệp / vai trò': 'Freelancer' },
      });
      const send = () =>
        fetch(`${API}/service-requests`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${tu}`,
            'idempotency-key': key,
          },
          body,
        });
      const [a, b] = await Promise.all([send(), send()]);
      const n = sql(
        `select count(*) from service_requests where full_name='Audit Dup' and created_at > now() - interval '1 minute'`,
      )[0]?.[0];
      return n === '1' ? null : `2 request song song → ${a.status}/${b.status}, tạo ${n} phiếu`;
    },
  );
  await check(
    null,
    'xss-comment',
    'Portal',
    'Góp ý dự án',
    'S2',
    'Rich text / script trong bình luận',
    'Sanitize, không lưu thẻ <script>',
    async () => {
      const pid = sql(
        `select id from projects where status='published' and visibility='public' limit 1`,
      )[0]?.[0];
      const r = await api(`/projects/${pid}/comments`, tu, {
        method: 'POST',
        body: { type: 'feedback', body: '<script>alert(1)</script><img src=x onerror=alert(2)> đ' },
      });
      const stored =
        sql(
          `select body from project_comments where project_id='${pid}' order by created_at desc limit 1`,
        )[0]?.[0] ?? '';
      await page.goto(`${PORTAL_URL}/login`);
      return r.status < 300 && /<script|onerror=/i.test(stored)
        ? `lưu nguyên văn: ${stored.slice(0, 80)} (cần kiểm FE có escape khi hiển thị)`
        : null;
    },
  );
  await check(
    null,
    'long-input-group',
    'Admin',
    'Tạo nhóm',
    'S4',
    'Tên 5.000 ký tự',
    '400 có fields, không 500',
    async () => {
      const r = await api('/admin/groups', t, {
        method: 'POST',
        body: {
          name: 'A'.repeat(5000),
          province: 'Hà Nội',
          description: 'x',
          lecturerIds: [],
          roomKeys: [],
          extraRooms: [],
          rules: [],
        },
      });
      return r.status >= 500 ? `HTTP ${r.status}` : null;
    },
  );
});

test('Chéo vai trò: ẩn tin, duyệt dự án, phí hết hạn', async ({ page }) => {
  const t = await apiLogin(ADMIN);
  await check(
    null,
    'hide-message',
    'Cross-role',
    'Kiểm duyệt → Chat Portal',
    'S2',
    'Admin ẩn tin bị báo cáo → Portal không còn thấy',
    'QT-06: Ẩn tin',
    () => verifyHiddenMessage(t),
  );
  await check(
    null,
    'fee-expired',
    'Cross-role',
    'Phí hết hạn → Portal',
    'S2',
    'Phí hết hạn → popup bắt buộc hiện lại, API trả 402',
    'BR-03, QT-04',
    async () => {
      const uid = sql(`select id from users where email='${USER.email}'`)[0]?.[0];
      sql(
        `update membership_fees set valid_until = now() - interval '1 day' where user_id='${uid}'`,
      );
      const r = await fetch(`${API}/dashboard/live`, {
        headers: { authorization: `Bearer ${await apiLogin(USER)}` },
      });
      await login(page, PORTAL_URL, USER);
      const popup = await page.getByRole('dialog', { name: 'Gói dịch vụ' }).count();
      resetDemo();
      const issues: string[] = [];
      if (r.status !== 402)
        issues.push(
          `/dashboard/live → ${r.status} (cần 402) khi valid_until đã qua nhưng job feeStatus chưa chạy (00:05)`,
        );
      if (!popup) issues.push('Portal không hiện popup bắt buộc');
      return issues.length ? issues.join('; ') : null;
    },
  );
});
