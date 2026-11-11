import { test as base, expect, type Page, type Response } from '@playwright/test';
import { reportDiscardedBodies, trackDocumentBodies } from './response-lifetime';
import { z } from 'zod';
import { keywordListSchema, mailTemplateListSchema } from '@opchub/shared/api-domains';
import { env } from '../../env';
import { ADMIN_URL } from '../../urls';

export { expect };
export type { Page };
const CONTENT_KEYS = new Set([
  'name',
  'fullName',
  'companyName',
  'title',
  'description',
  'bio',
  'note',
  'body',
  'subject',
  'skills',
  'intro',
  'rules',
  'reason',
]);
type Json = z.infer<ReturnType<typeof z.json>>;

function rawContent(value: Json, strings: Set<string>, content = false): void {
  if (typeof value === 'string') {
    if (content && value.trim().length > 1) strings.add(value.trim());
  } else if (Array.isArray(value)) {
    for (const child of value) rawContent(child, strings, content);
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value))
      rawContent(child, strings, CONTENT_KEYS.has(key));
  }
}

/** Native checks require an explicitly selected, private native cluster, never original PG5432. */
function requirePrivateNative(): void {
  if (env.E2E_TARGET !== 'server') return;
  if (!env.DIRECT_URL || env.SKIP_SEED !== '1')
    throw new Error(
      'Native i18n requires explicit isolated DIRECT_URL and SKIP_SEED=1; no seed/reset',
    );
  const db = new URL(env.DIRECT_URL);
  const api = new URL(env.API_PROXY_URL);
  if (
    !['127.0.0.1', 'localhost'].includes(db.hostname) ||
    !db.port ||
    db.port === '5432' ||
    !['/opchub_dev', '/opchub_v46_812_dev'].includes(db.pathname) ||
    !['127.0.0.1', 'localhost'].includes(api.hostname) ||
    !api.port ||
    api.port === '4000'
  )
    throw new Error('Native i18n refuses original/default database and API endpoints');
}

export interface BrowserGuard {
  raw: Set<string>;
  settle: () => Promise<void>;
}
export const test = base.extend<{ guard: BrowserGuard }>({
  guard: [
    async ({ page }, use, info) => {
      requirePrivateNative();
      const errors: string[] = [],
        writes: string[] = [],
        failures: string[] = [];
      const pending: Promise<void>[] = [];
      const network: string[] = [];
      const raw = new Set<string>();
      const documents = await trackDocumentBodies(page);
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('request', (request) => {
        const path = new URL(request.url()).pathname;
        if (path.startsWith('/v1/')) network.push(`${request.method()} ${path}`);
        if (!path.startsWith('/v1/') || ['GET', 'HEAD', 'OPTIONS'].includes(request.method()))
          return;
        if (request.method() === 'POST' && /^\/v1\/admin\/auth\/(login|refresh)$/.test(path))
          return;
        writes.push(`${request.method()} ${path}`);
      });
      const responseListener = (response: Response) => {
        const path = new URL(response.url()).pathname;
        if (!path.startsWith('/v1/')) return;
        network.push(`${response.status()} ${path}`);
        if (!response.ok() && !(path.endsWith('/auth/refresh') && response.status() === 401))
          failures.push(`${response.status()} ${path}`);
        if (response.ok() && response.headers()['content-type']?.includes('application/json')) {
          const parsing = (async () => {
            const result = await documents.json(response);
            if (result === undefined) return;
            const parsed = z.json().parse(result.body);
            rawContent(parsed, raw);
            // Stored moderation keywords are user-authored content, not filter-control labels.
            if (path === '/v1/admin/moderation/keywords')
              for (const word of keywordListSchema.parse(parsed).items) raw.add(word);
            if (path === '/v1/admin/campaigns/templates')
              for (const template of mailTemplateListSchema.parse(parsed).items) {
                raw.add(template.label);
                raw.add(template.hint);
              }
          })();
          // Handle rejection immediately, but retain/rethrow it at settle/teardown below.
          void parsing.catch(() => undefined);
          pending.push(parsing);
        }
      };
      page.on('response', responseListener);
      await use({
        raw,
        settle: async () => {
          await Promise.all(pending);
        },
      });
      page.off('response', responseListener);
      await Promise.all(pending);
      await documents.detach();
      await reportDiscardedBodies(info, documents.discarded);
      if (info.status !== info.expectedStatus) {
        await info.attach('i18n-network-paths-no-credentials', {
          body: JSON.stringify({ network, failures, writes, errors }),
          contentType: 'application/json',
        });
      }
      expect(network, 'Authenticated cases require a successful real browser login').toContain(
        '200 /v1/admin/auth/login',
      );
      expect(
        writes,
        'Read-only browsing must not mutate settings, content or export personal data',
      ).toEqual([]);
      expect(failures, 'Loaded-state coverage requires successful API preconditions').toEqual([]);
      expect(errors, 'No hydration, Intl missing-message or other browser errors').toEqual([]);
    },
    { auto: true },
  ],
});

export async function openLocalized(
  page: Page,
  path: string,
  locale: 'en' | 'en-SG' | 'vi' | 'zh' | 'id' | 'ms' | 'ms-BN' | 'fil' | 'th' | 'lo',
): Promise<void> {
  const labels = {
    en: { signIn: 'Sign in', notifications: 'Notifications' },
    'en-SG': { signIn: 'Sign in', notifications: 'Notifications' },
    zh: { signIn: '登录', notifications: '通知' },
    id: { signIn: 'Masuk', notifications: 'Notifikasi' },
    ms: { signIn: 'Log masuk', notifications: 'Pemberitahuan' },
    'ms-BN': { signIn: 'Log masuk', notifications: 'Pemberitahuan' },
    vi: { signIn: 'Đăng nhập', notifications: 'Thông báo' },
    fil: { signIn: 'Mag-sign in', notifications: 'Mga Abiso' },
    lo: { signIn: 'ເຂົ້າລະບົບ', notifications: 'ການແຈ້ງເຕືອນ' },
    th: { signIn: 'เข้าสู่ระบบ', notifications: 'การแจ้งเตือน' },
  }[locale];
  const { signIn } = labels;
  await page.context().addCookies([{ name: 'NEXT_LOCALE', value: locale, url: ADMIN_URL }]);
  await page.goto(`${ADMIN_URL}/login?next=${encodeURIComponent(path)}`, {
    waitUntil: 'networkidle',
  });
  await expect(page).toHaveTitle(`${signIn} · OPC Hub Admin`);
  await page.locator('input[autocomplete=username]').fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: signIn, exact: true }).click();
  await expect(page).toHaveURL(`${ADMIN_URL}${path}`);
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(
    page.getByRole('button', {
      name: labels.notifications,
      exact: true,
    }),
  ).toBeVisible();
  await page.waitForLoadState('networkidle');
}

export const openEnglish = (page: Page, path: string) => openLocalized(page, path, 'en');
