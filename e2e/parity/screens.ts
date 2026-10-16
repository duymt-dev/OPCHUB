import type { Page } from '@playwright/test';
import { ADMIN_URL, PORTAL_URL, PROTO_URL } from '../playwright.config';

export const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
] as const;

export interface ParityScreen {
  id: string;
  name: string;
  fullPage: boolean;
  /** Chuỗi thao tác trên prototype (screens.md) */
  proto: (page: Page) => Promise<void>;
  /** Chuỗi thao tác tương ứng trên app mới */
  app: (page: Page) => Promise<void>;
}

const ADMIN = { email: 'admin@opchub.community', pwd: 'Admin@2026' };

/** Toast đăng nhập hiện 2.2 s; chụp sau khi tắt */
const TOAST_GONE_MS = 2600;

async function protoOpen(page: Page) {
  await page.goto(`${PROTO_URL}/`, { waitUntil: 'networkidle' });
  await page.getByText('Chào mừng trở lại').waitFor();
}

async function protoLogin(page: Page, email: string, pwd: string) {
  await protoOpen(page);
  await page.locator('input[type=email]').first().fill(email);
  await page.locator('input[type=password]').first().fill(pwd);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
}

async function appLogin(page: Page, base: string, email: string, pwd: string) {
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(pwd);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
}

export const SCREENS: ParityScreen[] = [
  {
    id: 'A-01',
    name: 'Đăng nhập',
    fullPage: true,
    proto: protoOpen,
    app: async (page) => {
      await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
      await page.getByText('Chào mừng trở lại').waitFor();
    },
  },
  {
    id: 'D-01',
    name: 'Admin AppShell · Tổng quan',
    fullPage: false,
    proto: async (page) => {
      await protoLogin(page, ADMIN.email, ADMIN.pwd);
      await page.getByText('Theo dõi tăng trưởng').waitFor();
      await page.waitForTimeout(TOAST_GONE_MS);
    },
    app: async (page) => {
      await appLogin(page, ADMIN_URL, ADMIN.email, ADMIN.pwd);
      await page.getByText('Theo dõi tăng trưởng').waitFor();
      await page.waitForTimeout(TOAST_GONE_MS);
    },
  },
];
