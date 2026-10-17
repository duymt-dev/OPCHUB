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
  const r = (await call('/auth/login', { method: 'POST', body: JSON.stringify(ADMIN) })) as {
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
    joinMode: g.joinMode,
    ownerId,
    moderatorIds: g.moderatorIds,
    roomKeys: g.roomKeys,
    extraRooms: g.extraRooms,
    rules: g.rules,
    coverUrl: g.coverUrl,
  };
  await call(`/admin/groups/${groupId}`, { method: 'PATCH', body: JSON.stringify(body) }, t);
}

/** Ngân hàng giả báo tiền vào (FakeBank, đi đúng đường webhook ký HMAC) */
export async function simulateTransfer(content: string, amount = 600_000): Promise<void> {
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
export async function payFee(page: Page): Promise<void> {
  const content = await page.evaluate(async () => {
    const r = await fetch('/v1/auth/refresh', { method: 'POST', credentials: 'include' });
    const { accessToken } = (await r.json()) as { accessToken: string };
    const m = await fetch('/v1/me/membership', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    return ((await m.json()) as { transferContent: string }).transferContent;
  });
  await simulateTransfer(content);
  await page.reload({ waitUntil: 'networkidle' });
}
