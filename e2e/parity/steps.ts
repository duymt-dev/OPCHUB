import type { Page } from '@playwright/test';
import { ADMIN_URL, PORTAL_URL, PROTO_URL } from '../urls';
import type { Scenario, StepCtx } from './types';

export const ACCOUNTS = {
  user: { email: 'an.nguyen@mediasoft.vn', pwd: 'User@2026' },
  admin: { email: 'admin@opchub.community', pwd: 'Admin@2026' },
  /** D-28: TK demo chưa đóng phí — chỉ có ở MSW của app mới */
  unpaid: { email: 'do.haiyen@opchub.vn', pwd: 'User@2026' },
} as const;

const DEFAULT_APP_PATH = {
  auth: '/login',
  user: '/dashboard',
  admin: '/overview',
  unpaid: '/dashboard',
};

/** Bấm vào phần tử có chữ (khớp chính xác, phần tử hiện đầu tiên) */
export async function tap(c: StepCtx, text: string | RegExp) {
  const loc = c.page.getByText(text, { exact: typeof text === 'string' }).filter({ visible: true });
  await loc.first().click();
}

/** Bấm nút theo tên truy cập */
export async function press(c: StepCtx, name: string | RegExp) {
  await c.page
    .getByRole('button', { name, exact: typeof name === 'string' })
    .filter({ visible: true })
    .first()
    .click();
}

/** Gõ vào ô nhập theo placeholder */
export async function type(c: StepCtx, placeholder: string, value: string) {
  await c.page
    .getByPlaceholder(placeholder, { exact: true })
    .filter({ visible: true })
    .first()
    .fill(value);
}

export async function waitText(c: StepCtx, text: string | RegExp) {
  await c.page.getByText(text).filter({ visible: true }).first().waitFor({ timeout: 15_000 });
}

/** Cho đồng hồ giả chạy (timer của prototype/app) */
export async function tick(c: StepCtx, ms: number) {
  await c.page.clock.runFor(ms);
}

/** Mở mục trên sidebar; ở 390 phải mở drawer trước */
export async function nav(c: StepCtx, label: string) {
  if (c.vw === 390)
    await c.page.locator('[title="Menu"]').filter({ visible: true }).first().click();
  await c.page.locator('aside').getByText(label, { exact: true }).first().click();
}

/** §27.3 (TIP-V4-606): "Cài đặt hệ thống" mở từ menu người dùng ở cả prototype v4 và app */
export async function openSettings(c: StepCtx) {
  await c.page.locator('[data-m="me"]').filter({ visible: true }).first().click();
  await c.page
    .getByText('Cài đặt hệ thống', { exact: true })
    .filter({ visible: true })
    .last()
    .click();
}

async function login(page: Page, email: string, pwd: string) {
  // Prototype v4: ô "email hoặc số điện thoại" không còn type=email (app v4 cũng vậy, D-89)
  await page
    .locator('input[type=email], input[placeholder="Nhập email hoặc số điện thoại"]')
    .filter({ visible: true })
    .first()
    .fill(email);
  await page.locator('input[type=password]').filter({ visible: true }).first().fill(pwd);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
}

/** Đưa trang về điểm xuất phát của kịch bản, ở bên tương ứng */
export async function begin(c: StepCtx, s: Scenario) {
  const { page, side } = c;
  if (side === 'proto') {
    await page.goto(`${PROTO_URL}/`, { waitUntil: 'load' });
    await page.evaluate(() => localStorage.removeItem('opc-sb-mini'));
    await page.getByText('Chào mừng trở lại').waitFor({ timeout: 20_000 });
    if (s.start === 'user' || s.start === 'unpaid')
      await login(page, ACCOUNTS.user.email, ACCOUNTS.user.pwd);
    if (s.start === 'admin') await login(page, ACCOUNTS.admin.email, ACCOUNTS.admin.pwd);
    // Prototype v4: form đăng nhập nằm dưới landing nên trang đã cuộn; SPA một tài liệu giữ vị trí đó
    // sang Dashboard, còn app đổi trang về đầu → đưa về đầu như người dùng vừa vào màn mới
    if (s.start !== 'auth') await page.evaluate(() => window.scrollTo(0, 0));
  } else {
    const isAdmin = s.start === 'admin';
    const base = isAdmin ? ADMIN_URL : PORTAL_URL;
    await page.goto(`${base}/login`, { waitUntil: 'load' });
    await page.getByText('Chào mừng trở lại').waitFor({ timeout: 20_000 });
    if (s.start !== 'auth') {
      await login(page, ACCOUNTS[s.start].email, ACCOUNTS[s.start].pwd);
      await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    }
    const target = s.appPath ?? DEFAULT_APP_PATH[s.start];
    if (s.start !== 'auth' && target !== DEFAULT_APP_PATH[s.start]) {
      // điều hướng phía client để giữ phiên trong bộ nhớ
      await page.evaluate((p) => {
        window.history.pushState(null, '', p);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, target);
    } else if (s.start === 'auth' && target !== '/login') {
      await page.goto(`${base}${target}`, { waitUntil: 'load' });
    }
  }
  if (s.start !== 'auth') {
    // toast chào mừng đang đứng yên (đồng hồ dừng) — cho chạy hết để không lẫn vào ảnh
    await page.clock.runFor(2_300);
  }
}

/** Bấm phần tử theo thuộc tính title (icon, nút không chữ) */
export async function tapTitle(c: StepCtx, title: string) {
  await c.page.locator(`[title="${title}"]`).filter({ visible: true }).first().click();
}

/** Bấm phần tử có chữ khớp chính xác — bản cuối cùng đang hiện (tab nằm sau thẻ thống kê) */
export async function tapLast(c: StepCtx, text: string) {
  await c.page.getByText(text, { exact: true }).filter({ visible: true }).last().click();
}

/** Bấm bản thứ n (từ 0) của chữ khớp chính xác đang hiện */
export async function tapNth(c: StepCtx, text: string, n: number) {
  await c.page.getByText(text, { exact: true }).filter({ visible: true }).nth(n).click();
}

/** Chọn option theo nhãn trong ô select đầu tiên có option đó */
export async function choose(c: StepCtx, label: string) {
  await c.page
    .locator('select')
    .filter({ visible: true })
    .filter({ has: c.page.locator('option', { hasText: label }) })
    .first()
    .selectOption({ label });
}

/**
 * Bấm `action` bên trong thẻ nhỏ nhất chứa cả chữ `card` và `action`
 * (thẻ cộng đồng, sự kiện, dòng bảng…)
 */
export async function inCard(c: StepCtx, card: string, action: string) {
  const box = c.page
    .locator('div')
    .filter({ hasText: card })
    .filter({ has: c.page.getByText(action, { exact: true }) })
    .last();
  await box.getByText(action, { exact: true }).filter({ visible: true }).first().click();
}

/** Cho toast đang hiện chạy hết (2,2 s) trước bước kế tiếp */
export async function clearToast(c: StepCtx) {
  await c.page.clock.runFor(2_300);
}

/**
 * Bấm bằng sự kiện click DOM (bỏ qua kiểm tra nằm trong khung nhìn) —
 * dùng khi prototype đẩy phần tử ra ngoài màn 390 (dropdown, marquee)
 */
export async function hit(c: StepCtx, text: string | RegExp) {
  await c.page
    .getByText(text, { exact: typeof text === 'string' })
    .filter({ visible: true })
    .first()
    .dispatchEvent('click');
}

/** Bấm số trang trong thanh phân trang (bản cuối cùng đang hiện của chữ số đó) */
export async function pager(c: StepCtx, n: number) {
  await c.page.getByText(String(n), { exact: true }).filter({ visible: true }).last().click();
}

/**
 * Đưa trang và mọi vùng cuộn về đầu. Dùng khi prototype tự cuộn vì tác dụng phụ
 * (form đăng ký cao, `_scroll` trong cdu…) mà app không lặp lại — ghi lý do ở kịch bản.
 */
export async function resetScroll(c: StepCtx) {
  await c.page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('*').forEach((e) => {
      if (e.scrollTop > 0) e.scrollTop = 0;
    });
  });
}
