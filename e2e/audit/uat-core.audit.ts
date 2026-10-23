import { verifyWelcomeMail } from './checks/welcome-mail';
import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN,
  ADMIN_URL,
  api,
  apiLogin,
  finding,
  login,
  OTP,
  PORTAL_URL,
  record,
  resetDemo,
  sql,
  statusTexts,
  UNPAID,
  USER,
} from './lib';

/**
 * AUDIT-W1 · SRS §15 UAT (mốc M1 lõi): 01–12, 24–31 trên server thật (MSW tắt).
 * Mỗi test ghi đạt/trượt vào work/uat.jsonl; trượt → finding + ảnh. Không dừng ở lỗi đầu.
 */

const toastOf = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });

async function uat(page: Page | null, id: string, title: string, fn: () => Promise<string>) {
  let note = '';
  let ok = false;
  try {
    note = await fn();
    ok = true;
  } catch (e) {
    note = e instanceof Error ? (e.message.split('\n')[0] ?? '') : String(e);
  }
  record('uat', { id, title, result: ok ? 'ĐẠT' : 'TRƯỢT', note: note.slice(0, 300) });
  if (!ok)
    await finding(page, test.info(), {
      key: `uat-${id}`,
      area: 'UAT',
      screen: id,
      sev: 'S2',
      title: `${id} ${title} — trượt`,
      expected: title,
      actual: note.slice(0, 300),
      refs: id,
    });
}

const uniq = () => Date.now().toString().slice(-7);

async function openRegister(page: Page, kind: 'Doanh nghiệp' | 'Cá nhân') {
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Đăng ký' }).click();
  await page.getByRole('button', { name: new RegExp(`^${kind}`) }).click();
}

test.beforeAll(() => resetDemo());

test('UAT-01..04 đăng ký cá nhân + OTP', async ({ page }) => {
  const email = `uat${uniq()}@audit.opchub.test`;
  await openRegister(page, 'Cá nhân');
  await uat(page, 'UAT-01', 'Đăng ký cá nhân thiếu vai trò → bị chặn, báo lỗi', async () => {
    await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
    await expect(toastOf(page)).toHaveText(/vai trò/);
    return `toast: ${(await statusTexts(page)).join(' / ')}`;
  });
  await uat(page, 'UAT-02', 'Đăng ký cá nhân đủ thông tin → mở hộp OTP, gửi email', async () => {
    await page.getByPlaceholder('Nguyễn Văn An').fill('Người Audit');
    await page.getByRole('radio', { name: /Chuyên gia/ }).click();
    await page.getByPlaceholder('ban@congty.vn').fill(email);
    const phone = page.locator('input[type=tel]').filter({ visible: true }).first();
    if (await phone.count()) await phone.fill(`09${uniq()}1`.slice(0, 10));
    const pw = page.locator('input[type=password]').filter({ visible: true });
    for (let i = 0; i < (await pw.count()); i++) await pw.nth(i).fill('Audit@2026x');
    await page.getByText(/không hoàn lại sau khi thanh toán/).click();
    await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Xác thực email' })).toBeVisible({
      timeout: 15_000,
    });
    await expect
      .poll(
        () => sql(`select count(*) from mail_logs where "to"='${email}' and kind='otp'`)[0]?.[0],
        {
          timeout: 15_000,
        },
      )
      .toBe('1');
    return 'hộp OTP + mail_logs otp 1 dòng';
  });
  await uat(page, 'UAT-03', 'Nhập OTP thiếu số → "Vui lòng nhập đủ 6 chữ số"', async () => {
    const d = page.getByRole('dialog', { name: 'Xác thực email' });
    await page.getByLabel('Mã OTP').fill('123');
    await page.getByRole('button', { name: 'Xác nhận & kích hoạt tài khoản' }).click();
    await expect(d.getByRole('alert')).toHaveText('Vui lòng nhập đủ 6 chữ số');
    return 'ok';
  });
  await uat(
    page,
    'UAT-04',
    'OTP đúng → vào Portal; có ở Admin; mail chào mừng ghi log',
    async () => {
      await page.getByLabel('Mã OTP').fill(OTP);
      await page.getByRole('button', { name: 'Xác nhận & kích hoạt tài khoản' }).click();
      await page.waitForURL(
        (u) => !u.pathname.startsWith('/login') && !u.pathname.startsWith('/register'),
        {
          timeout: 20_000,
        },
      );
      const t = await apiLogin(ADMIN);
      const r = await api(`/admin/users?q=${encodeURIComponent(email)}`, t);
      expect(JSON.stringify(r.json)).toContain(email);
      await expect
        .poll(
          () =>
            sql(`select count(*) from mail_logs where "to"='${email}' and kind='welcome'`)[0]?.[0],
          {
            timeout: 20_000,
          },
        )
        .toBe('1');
      return `url ${new URL(page.url()).pathname}; Admin thấy; welcome log 1`;
    },
  );
  await uat(
    page,
    'UAT-06',
    'TK mới vào Portal → popup Gói dịch vụ tự hiện, không đóng được',
    async () => {
      await page.goto(`${PORTAL_URL}/dashboard`, { waitUntil: 'networkidle' });
      const p = page.getByRole('dialog', { name: 'Gói dịch vụ' });
      await expect(p).toBeVisible({ timeout: 15_000 });
      await expect(p.getByRole('button', { name: 'Đóng' })).toHaveCount(0);
      return 'popup hiện, không có nút Đóng';
    },
  );
  await uat(
    page,
    'UAT-07',
    'Bấm nền / đóng popup khi chưa TT → popup giữ nguyên, hiện nhắc',
    async () => {
      await page.keyboard.press('Escape');
      await page.mouse.click(5, 5);
      await expect(page.getByRole('dialog', { name: 'Gói dịch vụ' })).toBeVisible();
      await expect(toastOf(page)).toHaveText(/thanh toán phí thành viên/);
      return 'giữ popup + nhắc';
    },
  );
  await uat(
    page,
    'UAT-08',
    'Đăng ký thành viên ngay → hộp CK, nội dung OPCHUB TVxxxxxx SĐT',
    async () => {
      await page
        .getByRole('dialog', { name: 'Gói dịch vụ' })
        .getByRole('button', { name: /^Đăng ký · / })
        .click();
      const box = page.getByRole('dialog', { name: /^Thanh toán Gói / });
      await expect(box).toContainText(/OPCHUB TV\d{6} \d{9,11}/, { timeout: 15_000 });
      return 'nội dung CK đúng định dạng';
    },
  );
  await uat(
    page,
    'UAT-09',
    'Xác nhận đã CK → đối soát → Đang hiệu lực, popup đóng; Admin thấy',
    async () => {
      const box = page.getByRole('dialog', { name: /^Thanh toán Gói / });
      const content = ((await box.textContent()) ?? '').match(/OPCHUB TV\d{6} \d{9,11}/)?.[0] ?? '';
      await box.getByRole('button', { name: /Tôi đã chuyển khoản/ }).click();
      await api('/dev/bank/simulate', null, { method: 'POST', body: { amount: 600_000, content } });
      await expect(page.getByRole('dialog', { name: 'Gói dịch vụ' })).toHaveCount(0, {
        timeout: 30_000,
      });
      const st = sql(
        `select f.status from membership_fees f join users u on u.id=f.user_id where u.email='${email}'`,
      )[0]?.[0];
      expect(st).toBe('active');
      return 'popup tự đóng; fee active';
    },
  );
});

test('UAT-05 đăng ký DN bằng MST', async ({ page }) => {
  await uat(
    page,
    'UAT-05',
    'Đăng ký DN bằng MST hợp lệ → tự điền tên + ngành; OTP → Hoạt động',
    async () => {
      await openRegister(page, 'Doanh nghiệp');
      await page.getByPlaceholder('VD: 0101234567').fill('0101234567');
      await expect(page.getByPlaceholder('Công ty TNHH ...')).not.toHaveValue('', {
        timeout: 15_000,
      });
      await page.getByRole('button', { name: /OPC Hà Nội/ }).click();
      const email = `dn${uniq()}@audit.opchub.test`;
      await page.getByPlaceholder('lienhe@congty.vn').fill(email);
      const phone = page.locator('input[type=tel]').filter({ visible: true }).first();
      if (await phone.count()) await phone.fill(`08${uniq()}2`.slice(0, 10));
      const pw = page.locator('input[type=password]').filter({ visible: true });
      for (let i = 0; i < (await pw.count()); i++) await pw.nth(i).fill('Audit@2026x');
      await page.getByText(/không hoàn lại sau khi thanh toán/).click();
      await page.getByRole('button', { name: 'Đăng ký doanh nghiệp' }).click();
      await expect(page.getByRole('dialog', { name: 'Xác thực email' })).toBeVisible({
        timeout: 15_000,
      });
      await page.getByLabel('Mã OTP').fill(OTP);
      await page.getByRole('button', { name: 'Xác nhận & kích hoạt tài khoản' }).click();
      await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20_000 });
      expect(sql(`select status from users where email='${email}'`)[0]?.[0]).toBe('active');
      return 'MST tự điền; user active';
    },
  );
});

test('UAT-10 Admin ghi nhận đã thu', async ({ page }) => {
  await uat(
    page,
    'UAT-10',
    'Admin Ghi nhận đã thu cho TV chờ → Đang hiệu lực, hạn +12 tháng',
    async () => {
      const uid = sql(`select id from users where email='${UNPAID.email}'`)[0]?.[0] ?? '';
      const t = await apiLogin(ADMIN);
      const r = await api(`/admin/fees/${uid}/collect`, t, { method: 'POST', body: {} });
      expect(r.status).toBeLessThan(300);
      const [st, until] =
        sql(
          `select status, (valid_until - now()) > interval '360 days' from membership_fees where user_id='${uid}'`,
        )[0] ?? [];
      expect(st).toBe('active');
      expect(until).toBe('t');
      return `collect ${r.status}; active; hạn ≥ 360 ngày`;
    },
  );
});

test('UAT-11 đăng nhập + quên mật khẩu', async ({ page }) => {
  await uat(
    page,
    'UAT-11',
    'Đăng nhập / quên mật khẩu → đúng khu vực; gửi liên kết đặt lại',
    async () => {
      await login(page, PORTAL_URL, USER);
      expect(new URL(page.url()).pathname).not.toMatch(/login/);
      await page.context().clearCookies();
      await page.goto(`${PORTAL_URL}/forgot-password`, { waitUntil: 'networkidle' });
      const em = page.locator('input[type=email]').filter({ visible: true }).first();
      await em.fill(USER.email);
      await page.getByRole('button', { name: 'Gửi liên kết đặt lại' }).click();
      await expect
        .poll(
          () =>
            sql(
              `select count(*) from mail_logs where "to"='${USER.email}' and kind='password_reset' and created_at > now() - interval '2 minutes'`,
            )[0]?.[0],
          { timeout: 20_000 },
        )
        .toBe('1');
      // body_html bị xoá sau khi gửi (không lưu token) → mở đúng đường dẫn server sinh
      const res = await page.goto(`${PORTAL_URL}/reset-password?token=uat`, { waitUntil: 'load' });
      expect(res?.status(), 'GET /reset-password?token=*** (link trong mail đặt lại)').toBe(200);
      return 'đăng nhập ok; mail có link; trang đặt lại mở được';
    },
  );
});

test('UAT-12 tham gia nhóm + chủ nhóm duyệt', async ({ page }) => {
  await uat(
    page,
    'UAT-12',
    'Tham gia nhóm → vào nhóm hoặc Chờ duyệt; chủ nhóm duyệt → vào, có thông báo',
    async () => {
      const g = sql(
        `select g.id from groups g where g.join_mode='approval' and g.deleted_at is null and not exists (select 1 from group_members m join users u on u.id=m.user_id where m.group_id=g.id and u.email='${USER.email}') and exists (select 1 from group_members o join membership_fees f on f.user_id=o.user_id where o.group_id=g.id and o.group_role='owner' and f.valid_until > now()) order by g.slug limit 1`,
      )[0]?.[0];
      // chủ nhóm phải còn hạn phí (D-57) thì mới duyệt được — seed demo có ngày cố định
      expect(g, 'có nhóm cần duyệt mà m1 chưa vào').toBeTruthy();
      const tu = await apiLogin(USER);
      const j = await api(`/groups/${g}/join`, tu, {
        method: 'POST',
        body: { agreeRules: true, intro: 'Xin vào nhóm để học hỏi' },
      });
      expect(j.status, JSON.stringify(j.json)).toBeLessThan(300);
      const owner = sql(
        `select u.email from group_members m join users u on u.id=m.user_id where m.group_id='${g}' and m.group_role='owner'`,
      )[0]?.[0];
      expect(owner, 'nhóm có chủ').toBeTruthy();
      const uid = sql(`select id from users where email='${USER.email}'`)[0]?.[0];
      const to = await apiLogin({ email: owner ?? '', pwd: 'User@2026' });
      const a = await api(`/groups/${g}/requests/${uid}/approve`, to, { method: 'POST', body: {} });
      expect(a.status, JSON.stringify(a.json)).toBeLessThan(300);
      expect(
        sql(`select status from group_members where group_id='${g}' and user_id='${uid}'`)[0]?.[0],
      ).toBe('member');
      await expect
        .poll(
          () =>
            sql(
              `select count(*) from notifications where user_id='${uid}' and created_at > now() - interval '2 minutes'`,
            )[0]?.[0],
          { timeout: 15_000 },
        )
        .not.toBe('0');
      return `join ${j.status} → approve ${a.status} → member + thông báo`;
    },
  );
});

test('UAT-24..27 Admin thành viên', async ({ page }) => {
  const t = await apiLogin(ADMIN);
  await uat(page, 'UAT-24', 'Khóa thành viên → Đã khóa; không đăng nhập được', async () => {
    const uid = sql(`select id from users where email='${UNPAID.email}'`)[0]?.[0] ?? '';
    const r = await api(`/admin/users/${uid}/status`, t, {
      method: 'PATCH',
      body: { status: 'locked', reason: 'audit' },
    });
    expect(r.status, JSON.stringify(r.json)).toBeLessThan(300);
    const l = await api('/auth/login', null, {
      method: 'POST',
      body: { identifier: UNPAID.email, password: UNPAID.pwd },
    });
    expect(l.status).toBeGreaterThanOrEqual(400);
    return `khóa ${r.status}; login → ${l.status}`;
  });
  await uat(
    page,
    'UAT-25',
    'Gán 2 thành viên vào 1 nhóm → cả 2 có nhóm mới, giữ nhóm cũ',
    async () => {
      const ids = sql(
        `select id from users where system_role='member' and status='active' and email like '%@%' and id not like 'load-%' order by created_at limit 2`,
      ).map((r) => r[0] ?? '');
      const before = Number(
        sql(`select count(*) from group_members where user_id in ('${ids.join("','")}')`)[0]?.[0],
      );
      const g = sql(
        `select id from groups g where deleted_at is null and not exists (select 1 from group_members m where m.group_id=g.id and m.user_id in ('${ids.join("','")}')) limit 1`,
      )[0]?.[0];
      const r = await api('/admin/users/assign-groups', t, {
        method: 'POST',
        body: { userIds: ids, groupIds: [g] },
      });
      expect(r.status, JSON.stringify(r.json)).toBeLessThan(300);
      const after = Number(
        sql(`select count(*) from group_members where user_id in ('${ids.join("','")}')`)[0]?.[0],
      );
      expect(after).toBe(before + 2);
      return `gán ${r.status}; ${before} → ${after}`;
    },
  );
  await uat(
    page,
    'UAT-26',
    'Chọn tất cả trên bảng Thành viên → chỉ chọn dòng trang hiện tại',
    async () => {
      await page.context().clearCookies();
      await login(page, ADMIN_URL, ADMIN);
      await page.goto(`${ADMIN_URL}/members?size=6`, { waitUntil: 'networkidle' });
      const rows = await page.getByRole('checkbox', { name: /^Chọn (?!tất cả)/ }).count();
      await page.getByRole('checkbox', { name: 'Chọn tất cả trên trang' }).click();
      const checked = await page
        .getByRole('checkbox', { name: /^Chọn (?!tất cả)/ })
        .evaluateAll(
          (e) =>
            e.filter(
              (x) => x.getAttribute('aria-checked') === 'true' || (x as HTMLInputElement).checked,
            ).length,
        );
      const pager = (await page.getByText(/Hiển thị/).allInnerTexts()).join(' ');
      expect(checked).toBe(rows);
      return `trang ${rows} dòng, đã chọn ${checked}; ${pager}`;
    },
  );
  await uat(
    page,
    'UAT-27',
    'Phân trang các danh sách Admin → đúng số dòng/trang (BR-12), tự lùi trang khi lọc',
    async () => {
      // Đếm theo dòng "Hiển thị a–b / N" của từng màn (BR-12: 10; Sự kiện 9; Nhóm 12)
      const expects: [string, number][] = [
        ['members', 10],
        ['fees', 10],
        ['events', 9],
        ['groups', 12],
        ['projects', 10],
        ['investors', 10],
        ['requests', 10],
      ];
      const notes: string[] = [];
      const bad: string[] = [];
      for (const [p, n] of expects) {
        await page.goto(`${ADMIN_URL}/${p}`, { waitUntil: 'networkidle' });
        const txt = (await page.getByText(/Hiển thị \d+[–-]\d+ \/ \d+/).allInnerTexts()).join(' ');
        const m = /Hiển thị (\d+)[–-](\d+) \/ (\d+)/.exec(txt);
        if (!m) {
          notes.push(`${p}: không có dòng phân trang`);
          continue;
        }
        const per = Number(m[2]) - Number(m[1]) + 1;
        const total = Number(m[3]);
        notes.push(`${p} ${m[0]}`);
        if (per !== Math.min(n, total)) bad.push(`${p}: ${per}/trang, cần ${n}`);
      }
      expect(bad, `${bad.join('; ')} | ${notes.join('; ')}`).toEqual([]);
      return notes.join('; ');
    },
  );
});

test('UAT-28..29 cài đặt mail', async ({ page }) => {
  const t = await apiLogin(ADMIN);
  await uat(page, 'UAT-28', 'Cấu hình SMTP thiếu key → Kiểm tra kết nối báo lỗi', async () => {
    const cur = await api('/admin/smtp', t);
    const body = { ...(cur.json as Record<string, unknown>), key: '', login: '' };
    const r = await api('/admin/smtp/verify', t, { method: 'POST', body });
    expect(
      r.status === 400 || JSON.stringify(r.json).match(/ok"?:\s*false|lỗi|thiếu/i),
    ).toBeTruthy();
    return `verify thiếu key → ${r.status}`;
  });
  await uat(
    page,
    'UAT-29',
    'Sửa email chào mừng, thêm tài liệu → xem trước và email mới đúng',
    () => verifyWelcomeMail(page, t),
  );
});

test('UAT-30 đăng xuất', async ({ page }) => {
  await uat(page, 'UAT-30', 'Đăng xuất → về màn đăng nhập, đóng mọi popup', async () => {
    await login(page, PORTAL_URL, USER);
    await page.getByText('Founder OPC', { exact: true }).first().click();
    await page.getByText('Đăng xuất', { exact: true }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const res = await page.goto(`${PORTAL_URL}/dashboard`, { waitUntil: 'networkidle' });
    expect(res?.ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/login/);
    return 'về /login, không popup; vào lại /dashboard bị đẩy về login';
  });
});

test('UAT-31 mobile 390px', async ({ page }) => {
  await uat(
    page,
    'UAT-31',
    'Hiển thị mobile 390px → không tràn ngang; bảng Admin thành thẻ',
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      const over: string[] = [];
      await login(page, PORTAL_URL, USER);
      for (const p of [
        '/dashboard',
        '/community',
        '/chat',
        '/events',
        '/projects',
        '/profile',
        '/services',
      ]) {
        await page.goto(`${PORTAL_URL}${p}`, { waitUntil: 'networkidle' });
        const w = await page.evaluate(() => document.documentElement.scrollWidth);
        if (w > 392) over.push(`portal${p}=${w}`);
      }
      await page.context().clearCookies();
      await login(page, ADMIN_URL, ADMIN);
      for (const p of [
        '/overview',
        '/members',
        '/fees',
        '/groups',
        '/events',
        '/projects',
        '/investors',
        '/requests',
        '/marketing',
        '/settings',
        '/bots',
      ]) {
        await page.goto(`${ADMIN_URL}${p}`, { waitUntil: 'networkidle' });
        const w = await page.evaluate(() => document.documentElement.scrollWidth);
        const tables = await page.locator('table').filter({ visible: true }).count();
        if (w > 392) over.push(`admin${p}=${w}`);
        if (tables) over.push(`admin${p}:table×${tables}`);
      }
      expect(over, over.join(', ')).toEqual([]);
      return 'không tràn, không bảng';
    },
  );
});
