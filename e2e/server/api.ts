import { PRICE_DEFAULTS } from '@opchub/shared/fixtures';
import type { Page } from '@playwright/test';
import { env } from '../env';

/**
 * Thao tác trực tiếp lên API thật cho các test hành vi chạy ở chế độ server (TIP-B62): thay cho
 * "nút" chỉ có ở MSW (cookie giả, webhook tự hẹn giờ). Bản MSW không gọi những hàm này.
 * Mật khẩu là dữ liệu demo công khai của prototype (ACCOUNTS), không phải secret.
 */

export const onServer = env.E2E_TARGET === 'server';
const API = `${env.API_PROXY_URL}/v1`;
const ADMIN = { identifier: 'admin@opchub.community', password: 'Admin@2026' };

async function call(path: string, init: RequestInit = {}, token?: string): Promise<unknown> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status}`);
  return res.status === 204 ? null : res.json();
}

async function adminToken(): Promise<string> {
  // D-62 (TIP-V2-202): TK quản trị đăng nhập ở cổng Admin
  const r = (await call('/admin/auth/login', { method: 'POST', body: JSON.stringify(ADMIN) })) as {
    accessToken: string;
  };
  return r.accessToken;
}

/** A-11: tắt "Mở đăng ký" trong Cài đặt chung (fixture reset dữ liệu trả lại ở test sau) */
export async function closeRegistration(): Promise<void> {
  const t = await adminToken();
  await call(
    '/admin/settings/general',
    { method: 'PATCH', body: JSON.stringify({ openRegistration: false }) },
    t,
  );
}

/** Đổi chủ nhóm qua Admin (D-43: chủ nhóm không tự rời được) */
export async function setGroupOwner(groupId: string, ownerId: string): Promise<void> {
  const t = await adminToken();
  const g = (await call(`/admin/groups/${groupId}`, {}, t)) as Record<string, unknown>;
  const body = {
    name: g.name,
    province: g.province,
    description: g.description,
    ownerId,
    lecturerIds: g.lecturerIds,
    roomKeys: g.roomKeys,
    extraRooms: g.extraRooms,
    rules: g.rules,
    coverUrl: g.coverUrl,
  };
  await call(`/admin/groups/${groupId}`, { method: 'PATCH', body: JSON.stringify(body) }, t);
}

/** Admin khoá một thành viên theo email (NA-16) — đi đúng đường `PATCH /admin/users/:id/status` */
export async function lockMember(email: string): Promise<void> {
  const t = await adminToken();
  const q = encodeURIComponent(email);
  const page = (await call(`/admin/users?q=${q}`, {}, t)) as { items: { id: string }[] };
  const id = page.items[0]?.id;
  if (!id) throw new Error(`Không tìm thấy thành viên ${email}`);
  await call(
    `/admin/users/${id}/status`,
    { method: 'PATCH', body: JSON.stringify({ status: 'locked', reason: 'UAT-24' }) },
    t,
  );
}

/**
 * REQ-106: chủ dự án (TK demo An) sửa dự án đang hiển thị + gửi duyệt → bản sửa Chờ duyệt, đi đúng
 * đường `PATCH /projects/:id` như form Portal
 */
export async function reviseProject(id: string, name: string): Promise<void> {
  const login = (await call('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'an.nguyen@mediasoft.vn', password: 'User@2026' }),
  })) as { accessToken: string };
  const t = login.accessToken;
  const cur = (await call(`/me/projects/${id}`, {}, t)) as {
    category: string;
    summary: string;
    testUrl: string | null;
  };
  const body = {
    name,
    category: cur.category,
    summary: cur.summary,
    testUrl: cur.testUrl ?? 'https://demo.opchub.vn',
    submit: true,
  };
  await call(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, t);
}

/** Ngân hàng giả báo tiền vào (FakeBank, đi đúng đường webhook ký HMAC) */
/** Mặc định = Gói Cá nhân (D-68): TK demo chưa đóng phí + TK mới đăng ký cá nhân */
export async function simulateTransfer(
  content: string,
  amount = PRICE_DEFAULTS.per.y,
): Promise<void> {
  await call('/dev/bank/simulate', { method: 'POST', body: JSON.stringify({ amount, content }) });
}

/** Đăng nhập thêm `n` phiên (thiết bị khác) cho một thành viên demo */
export async function extraSessions(identifier: string, password: string, n: number) {
  const body = JSON.stringify({ identifier, password });
  await Promise.all(Array.from({ length: n }, () => call('/auth/login', { method: 'POST', body })));
}

/** Gọi API từ trang đang đăng nhập: access token lấy bằng refresh cookie như app */
export async function pageFetch(page: Page, path: string, method: string): Promise<void> {
  await page.evaluate(
    async ({ path: p, method: m }) => {
      const r = await fetch('/v1/auth/refresh', { method: 'POST', credentials: 'include' });
      const { accessToken } = (await r.json()) as { accessToken: string };
      await fetch(`/v1${p}`, { method: m, headers: { authorization: `Bearer ${accessToken}` } });
    },
    { path, method },
  );
}

/**
 * TK vừa tạo (chờ phí) đóng phí qua ngân hàng giả rồi tải lại trang: trên API thật các màn
 * "Đăng nhập + phí" (dashboard, dự án của tôi) trả MEMBERSHIP_REQUIRED khi chưa đóng (BR-03).
 */
export async function payFee(page: Page, opts: { reload?: boolean } = {}): Promise<void> {
  const content = await page.evaluate(async () => {
    const r = await fetch('/v1/auth/refresh', { method: 'POST', credentials: 'include' });
    const { accessToken } = (await r.json()) as { accessToken: string };
    const m = await fetch('/v1/me/membership', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    return ((await m.json()) as { transferContent: string }).transferContent;
  });
  await simulateTransfer(content);
  // reload: false — giữ modal chỉ hiện một lần (mail chào mừng) trên trang hiện tại
  if (opts.reload ?? true) await page.reload({ waitUntil: 'networkidle' });
}

/**
 * NA-28 (REQ-228): Super Admin đặt lại quyền một vai trò hệ thống từ phiên khác. Server: phiên API
 * riêng của Super Admin. MSW: CSDL giả nằm trong trang nên gọi qua trang với token giả `mock.admin`.
 */
export async function setRoleGrants(page: Page, roleKey: string, keys: string[]): Promise<void> {
  type Roles = { items: { id: string; key: string | null }[] };
  if (onServer) {
    const t = await adminToken();
    const roles = (await call('/admin/admin-roles', {}, t)) as Roles;
    const id = roles.items.find((r) => r.key === roleKey)?.id ?? '';
    const body = JSON.stringify({ [id]: keys });
    await call('/admin/admin-roles/permissions', { method: 'PUT', body }, t);
    return;
  }
  await page.evaluate(
    async ({ roleKey: k, keys: g }) => {
      const headers = { authorization: 'Bearer mock.admin', 'content-type': 'application/json' };
      const r = (await (await fetch('/v1/admin/admin-roles', { headers })).json()) as Roles;
      const id = r.items.find((x) => x.key === k)?.id ?? '';
      await fetch('/v1/admin/admin-roles/permissions', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ [id]: g }),
      });
    },
    { roleKey, keys },
  );
}

/** Phiên thành viên demo khác (m2 Lê Minh Anh) cho các ca "người khác thao tác" */
const OTHER = { identifier: 'minhanh@leadpilot.ai', password: 'User@2026' };

/**
 * NA-25: thành viên khác gửi tin vào phòng. Server: phiên API riêng của m2. MSW: CSDL giả nằm
 * trong trang nên gửi qua trang với token giả `mock.m2`.
 */
export async function otherSends(page: Page, roomId: string, body: string): Promise<void> {
  const json = JSON.stringify({ clientMsgId: crypto.randomUUID(), body });
  if (onServer) {
    const r = (await call('/auth/login', { method: 'POST', body: JSON.stringify(OTHER) })) as {
      accessToken: string;
    };
    await call(`/rooms/${roomId}/messages`, { method: 'POST', body: json }, r.accessToken);
    return;
  }
  await page.evaluate(
    async ({ id, b }) => {
      await fetch(`/v1/rooms/${id}/messages`, {
        method: 'POST',
        headers: { authorization: 'Bearer mock.m2', 'content-type': 'application/json' },
        body: b,
      });
    },
    { id: roomId, b: json },
  );
}

/** NA-24: thành viên gửi dự án mới chờ duyệt (server: API Portal của m2; MSW: route giả của Admin) */
export async function otherSubmitsProject(page: Page): Promise<void> {
  if (onServer) {
    const r = (await call('/auth/login', { method: 'POST', body: JSON.stringify(OTHER) })) as {
      accessToken: string;
    };
    const body = {
      name: `Dự án chờ duyệt ${Date.now()}`,
      category: 'SaaS',
      summary: 'Dự án mới gửi duyệt để kiểm tra số đỏ',
      testUrl: 'https://demo.opchub.vn',
      submit: true,
    };
    await call('/projects', { method: 'POST', body: JSON.stringify(body) }, r.accessToken);
    return;
  }
  await page.evaluate(async () => {
    await fetch('/v1/__mock/projects/submit', { method: 'POST' });
  });
}

/** Server: tạo một "thảo luận" thật trong 24h — m2 hỏi, TV demo m1 trả lời (khối Thảo luận nổi bật) */
export async function threadWithReply(roomId: string): Promise<void> {
  const tokenOf = async (identifier: string) =>
    (
      (await call('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password: 'User@2026' }),
      })) as { accessToken: string }
    ).accessToken;
  const send = (t: string, body: Record<string, unknown>) =>
    call(
      `/rooms/${roomId}/messages`,
      { method: 'POST', body: JSON.stringify({ clientMsgId: crypto.randomUUID(), ...body }) },
      t,
    ) as Promise<{ id: string }>;
  const q = await send(await tokenOf(OTHER.identifier), {
    body: 'Mọi người dùng công cụ gì để chốt sale?',
  });
  await send(await tokenOf('an.nguyen@mediasoft.vn'), { body: 'Mình dùng CRM nhẹ', replyTo: q.id });
}
