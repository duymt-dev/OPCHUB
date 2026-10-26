import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN,
  ADMIN_URL,
  api,
  apiLogin,
  finding,
  login,
  PORTAL_URL,
  record,
  resetDemo,
  sql,
  USER,
} from './lib';

/**
 * AUDIT-W1 · SRS §15 UAT mốc M2/M3: 13–23 trên server thật. Chat kiểm qua 2 trình duyệt thật
 * (socket); phần còn lại kiểm qua UI + API/DB để thấy hệ quả. Ghi work/uat.jsonl.
 */

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

const M2 = { email: 'tran.minhkhoa@opchub.vn', pwd: 'User@2026' };
const uniq = () => Date.now().toString().slice(-7);

test.beforeAll(() => resetDemo());

test('UAT-13 chat realtime 2 trình duyệt', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  await uat(a, 'UAT-13', 'Gửi tin trong chat → tin hiển thị realtime ở người khác', async () => {
    const m2 = sql(
      `select u.email from users u join group_members m on m.user_id=u.id where m.group_id='c1' and m.status='member' and u.email<>'${USER.email}' and u.status='active' and u.system_role='member' limit 1`,
    )[0]?.[0];
    expect(m2, 'có thành viên khác trong c1').toBeTruthy();
    await login(a, PORTAL_URL, USER);
    await login(b, PORTAL_URL, { email: m2 ?? M2.email, pwd: 'User@2026' });
    await a.goto(`${PORTAL_URL}/chat/c1`, { waitUntil: 'networkidle' });
    await b.goto(`${PORTAL_URL}/chat/c1`, { waitUntil: 'networkidle' });
    const msg = `audit realtime ${uniq()}`;
    await a.getByPlaceholder(/^Nhắn tin trong #/).fill(msg);
    await a.keyboard.press('Enter');
    await expect(b.getByText(msg)).toBeVisible({ timeout: 10_000 });
    return `B thấy tin của A không cần tải lại (${m2})`;
  });
  await a.context().close();
  await b.context().close();
});

test('UAT-14..15 bot', async ({ page }) => {
  const t = await apiLogin(ADMIN);
  await uat(
    page,
    'UAT-14',
    'Thành viên thật nhắn trong nhóm → persona trong giờ, trong nhóm tự phản hồi',
    async () => {
      const s = (await api('/admin/bot/settings', t)).json as Record<string, unknown>;
      const tu = await apiLogin(USER);
      const room = sql(`select id from rooms where group_id='c1' and slug='general'`)[0]?.[0];
      const before = Number(sql(`select count(*) from bot_threads`)[0]?.[0] ?? 0);
      const r = await api(`/rooms/${room}/messages`, tu, {
        method: 'POST',
        body: {
          body: `Mọi người cho hỏi kinh nghiệm kế toán ${uniq()}`,
          clientMsgId: `audit-${uniq()}`,
        },
      });
      expect(r.status, JSON.stringify(r.json).slice(0, 200)).toBeLessThan(300);
      await new Promise((res) => setTimeout(res, 8_000));
      const after = Number(sql(`select count(*) from bot_threads`)[0]?.[0] ?? 0);
      const persona = Number(
        sql(
          `select count(*) from messages where room_id='${room}' and persona_id is not null and created_at > now() - interval '1 minute'`,
        )[0]?.[0] ?? 0,
      );
      expect(
        after > before || persona > 0,
        `replyToMembers=${String(s.replyToMembers)}; thread ${before}→${after}; tin persona ${persona}`,
      ).toBeTruthy();
      return `thread ${before}→${after}, tin persona ${persona}`;
    },
  );
  await uat(
    page,
    'UAT-15',
    'Bot tự động: tạo hội thoại theo lịch, đăng theo giãn cách; hiện ở Dashboard',
    async () => {
      const sc = sql(`select id from bot_scripts order by created_at limit 1`)[0]?.[0];
      expect(sc, 'có kịch bản').toBeTruthy();
      const run = await api(`/admin/scripts/${sc}/run`, t, { method: 'POST', body: {} });
      expect(run.status, JSON.stringify(run.json).slice(0, 200)).toBeLessThan(300);
      const th = (await api('/admin/bot/threads', t)).json as {
        items?: { id: string; status: string }[];
      };
      const pend = (th.items ?? []).find((x) => x.status === 'pending');
      expect(pend, 'có hội thoại chờ duyệt').toBeTruthy();
      const ap = await api(`/admin/bot/threads/${pend?.id}/approve`, t, {
        method: 'POST',
        body: {},
      });
      expect(ap.status, JSON.stringify(ap.json).slice(0, 200)).toBeLessThan(300);
      await login(page, PORTAL_URL, USER);
      await page.goto(`${PORTAL_URL}/dashboard`, { waitUntil: 'networkidle' });
      const sim = sql(
        `select count(*) from messages where is_simulated and created_at > now() - interval '5 minutes'`,
      )[0]?.[0];
      expect(Number(sim)).toBeGreaterThan(0);
      return `run ${run.status} → duyệt ${ap.status} → ${sim} tin persona (D-04: luôn duyệt, không tự đăng theo lịch)`;
    },
  );
});

test('UAT-16 đăng ký sự kiện', async ({ page }) => {
  await uat(page, 'UAT-16', 'Đăng ký sự kiện → lưu đăng ký, gửi xác nhận', async () => {
    const tu = await apiLogin(USER);
    const uid = sql(`select id from users where email='${USER.email}'`)[0]?.[0];
    const ev = sql(
      `select e.id from events e where e.starts_at > now() and e.registration_open and not exists (select 1 from event_registrations r where r.event_id=e.id and r.user_id='${uid}' and r.status='registered') and (e.seats is null or e.seats > (select count(*) from event_registrations r2 where r2.event_id=e.id and r2.status='registered')) order by e.starts_at limit 1`,
    )[0]?.[0];
    expect(ev, 'có sự kiện còn chỗ').toBeTruthy();
    const r = await api(`/events/${ev}/registration`, tu, { method: 'POST', body: {} });
    expect(r.status, JSON.stringify(r.json).slice(0, 200)).toBeLessThan(300);
    await expect
      .poll(
        () =>
          sql(
            `select count(*) from mail_logs where "to"='${USER.email}' and kind='event' and created_at > now() - interval '2 minutes'`,
          )[0]?.[0],
        { timeout: 20_000 },
      )
      .toBe('1');
    return `đăng ký ${r.status}; mail xác nhận 1`;
  });
});

test('UAT-17..18 dự án', async ({ page }) => {
  const tu = await apiLogin(USER);
  const t = await apiLogin(ADMIN);
  let pid = '';
  await uat(page, 'UAT-17', 'Đăng dự án mới → trạng thái Chờ duyệt', async () => {
    const cat = sql(
      `select name from categories where 'project' = any(scopes) and not hidden and deleted_at is null limit 1`,
    )[0]?.[0];
    const r = await api('/projects', tu, {
      method: 'POST',
      body: {
        name: `Dự án audit ${uniq()}`,
        category: cat,
        summary: 'Dự án thử nghiệm của đợt rà soát hệ thống',
        stage: 'idea',
        testUrl: 'https://audit.example.com',
        submit: true,
      },
    });
    expect(r.status, JSON.stringify(r.json).slice(0, 300)).toBeLessThan(300);
    pid = String((r.json as { id?: string }).id ?? '');
    expect(sql(`select status from projects where id='${pid}'`)[0]?.[0]).toBe('pending_review');
    return `tạo ${r.status}; status pending_review (Chờ duyệt)`;
  });
  await uat(page, 'UAT-18', 'Admin duyệt dự án → Đang hiển thị ở Khám phá', async () => {
    expect(pid, 'cần dự án từ UAT-17').toBeTruthy();
    const r = await api(`/admin/projects/${pid}/review`, t, {
      method: 'POST',
      body: { decision: 'approve' },
    });
    expect(r.status, JSON.stringify(r.json).slice(0, 200)).toBeLessThan(300);
    const list = await api(`/projects?q=${encodeURIComponent('Dự án audit')}&size=50`, tu);
    expect(JSON.stringify(list.json)).toContain(pid);
    return `duyệt ${r.status}; có ở Khám phá`;
  });
});

test('UAT-19..20 nhà đầu tư', async ({ page }) => {
  const tu = await apiLogin(USER);
  const t = await apiLogin(ADMIN);
  const pid = sql(
    `select p.id from projects p join users u on u.id=p.owner_id where p.status='published' and exists (select 1 from project_fundings f where f.project_id=p.id) and u.email<>'${USER.email}' and not exists (select 1 from investor_interests i join users v on v.id=i.user_id where i.project_id=p.id and v.email='${USER.email}') limit 1`,
  )[0]?.[0];
  await uat(page, 'UAT-19', 'Gửi quan tâm đầu tư thiếu SĐT / đơn vị → bị chặn', async () => {
    expect(pid, 'có dự án gọi vốn').toBeTruthy();
    const noPhone = await api(`/projects/${pid}/interest`, tu, {
      idem: true,
      method: 'POST',
      body: {
        kind: 'individual',
        contactName: 'Nguyễn Văn An',
        phone: '',
        amount: 200_000_000,
        message: 'Quan tâm',
      },
    });
    const noOrg = await api(`/projects/${pid}/interest`, tu, {
      idem: true,
      method: 'POST',
      body: {
        kind: 'fund',
        contactName: 'Nguyễn Văn An',
        organization: '',
        phone: '0912345678',
        amount: 200_000_000,
        message: 'Quan tâm',
      },
    });
    expect(noPhone.status).toBe(400);
    expect(noOrg.status, `quỹ thiếu đơn vị → ${noOrg.status} (BR-09)`).toBe(400);
    return `thiếu SĐT ${noPhone.status}; quỹ thiếu đơn vị ${noOrg.status}`;
  });
  await uat(
    page,
    'UAT-20',
    'D-72: Admin thấy nhà đầu tư trong danh sách; trao đổi / trạng thái đã bỏ',
    async () => {
      const ok = await api(`/projects/${pid}/interest`, tu, {
        idem: true,
        method: 'POST',
        body: {
          kind: 'individual',
          contactName: 'Nguyễn Văn An',
          phone: '0912345678',
          amount: 200_000_000,
          message: 'Quan tâm audit',
        },
      });
      expect(ok.status, JSON.stringify(ok.json).slice(0, 200)).toBeLessThan(300);
      const list = (await api('/admin/investors', t)).json as {
        items?: { key: string; name: string }[];
      };
      const key = (list.items ?? []).find((x) => /Nguyễn Văn An/.test(x.name))?.key;
      expect(key, 'nhà đầu tư xuất hiện ở Admin').toBeTruthy();
      const c = await api(`/admin/investors/${key}/comments`, t, {
        method: 'POST',
        body: { body: 'x' },
      });
      expect(c.status, 'route bình luận NĐT đã bỏ (D-72)').toBe(404);
      expect((await api('/me/investor-thread', tu)).status, 'luồng NĐT đã bỏ (D-72)').toBe(404);
      return 'NĐT có ở danh sách Admin; route trao đổi 404';
    },
  );
});

test('UAT-21..23 dịch vụ', async ({ page }) => {
  const tu = await apiLogin(USER);
  const t = await apiLogin(ADMIN);
  const svc = sql(`select id from services where enabled limit 1`)[0]?.[0];
  let code = '';
  await uat(page, 'UAT-21', 'Gửi form tư vấn thiếu trường bắt buộc → bị chặn', async () => {
    const r = await api('/service-requests', tu, {
      idem: true,
      method: 'POST',
      body: { serviceId: svc, requesterType: 'business', fullName: 'A', phone: '', email: 'x' },
    });
    expect(r.status).toBe(400);
    const dn = await api('/service-requests', tu, {
      idem: true,
      method: 'POST',
      body: {
        serviceId: svc,
        requesterType: 'business',
        fullName: 'Người Audit',
        phone: '0912345678',
        email: 'a@b.vn',
      },
    });
    expect(dn.status, `DN thiếu tên DN/MST (QT-11) → ${dn.status}`).toBe(400);
    return `thiếu SĐT/email ${r.status}; DN thiếu tên DN/MST ${dn.status}`;
  });
  await uat(
    page,
    'UAT-22',
    'Gửi form tư vấn hợp lệ → tạo YC-xxxx trạng thái Mới ở Admin',
    async () => {
      const r = await api('/service-requests', tu, {
        idem: true,
        method: 'POST',
        body: {
          serviceId: svc,
          requesterType: 'personal',
          fullName: 'Người Audit',
          phone: '0912345678',
          email: 'a@b.vn',
          address: 'Hà Nội',
          note: 'Cần tư vấn',
          details: { 'Nghề nghiệp / vai trò': 'Freelancer' },
        },
      });
      expect(r.status, JSON.stringify(r.json).slice(0, 200)).toBeLessThan(300);
      code = String((r.json as { code?: string }).code ?? '');
      expect(code).toMatch(/^YC-\d+/);
      const adm = await api(`/admin/service-requests?q=${code}`, t);
      expect(JSON.stringify(adm.json)).toContain(code);
      expect(JSON.stringify(adm.json), 'D-72 phiếu không trạng thái').not.toContain('"status"');
      return `${code} có ở Admin`;
    },
  );
  await uat(
    page,
    'UAT-23',
    'D-72: route chuyển trạng thái đã bỏ; ghi chú gắn tên → người được gắn nhận thông báo',
    async () => {
      const tr = await api(`/admin/service-requests/${code}/transition`, t, {
        method: 'POST',
        body: { from: 'new', to: 'consulting' },
      });
      expect(tr.status, 'route chuyển trạng thái YC đã bỏ (D-72)').toBe(404);
      const staff = (await api('/admin/service-requests/staff', t)).json as
        { items?: { id: string; name: string }[] } | { id: string; name: string }[];
      const list = Array.isArray(staff) ? staff : (staff.items ?? []);
      const who = list[0];
      expect(who, 'có nhân sự').toBeTruthy();
      const c = await api(`/admin/service-requests/${code}/comments`, t, {
        method: 'POST',
        body: { body: `@${who?.name} xem giúp`, mentions: [who?.name] },
      });
      expect(c.status, JSON.stringify(c.json).slice(0, 200)).toBeLessThan(300);
      await expect
        .poll(
          () =>
            sql(
              `select count(*) from notifications where user_id='${who?.id}' and created_at > now() - interval '2 minutes'`,
            )[0]?.[0],
          { timeout: 20_000 },
        )
        .not.toBe('0');
      await login(page, ADMIN_URL, ADMIN);
      return `transition ${tr.status}; gắn ${who?.name} → có thông báo`;
    },
  );
});
