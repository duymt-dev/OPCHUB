import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { loginResponseSchema } from '@opchub/shared/api';
import {
  DEFAULT_APP_NOTIFY,
  pushPreferencesSchema,
  pushPayloadSchema,
} from '@opchub/shared/api-domains';
import { expect, test, type Page } from '../server/test';
import { onServer } from '../server/api';
import { settingsFixture, settingsLogin } from '../llm/settings-session';
import { ADMIN_URL, PORTAL_URL } from '../urls';
import { env } from '../env';

const STUB = `http://127.0.0.1:${env.DLPL_STUB_PORT + 1}`;
/** Browser protocol shim only: never subscribe to Google's/Mozilla's/Apple's real push service. */
async function browserDevice(page: Page, endpoint: string) {
  await page.context().grantPermissions(['notifications']);
  await page.addInitScript(
    ({ endpoint }) => {
      // Headless Chromium may report denied despite the granted Permissions query.
      // This browser-protocol shim models the granted fixture, never a production bypass.
      Object.defineProperty(Notification, 'permission', {
        configurable: true,
        get: () => 'granted',
      });
      const storage = 'v46-816-browser-device';
      const subscription = () => ({
        endpoint,
        expirationTime: null,
        toJSON: () => ({
          endpoint,
          expirationTime: null,
          keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
        }),
        unsubscribe: () => {
          localStorage.removeItem(storage);
          return Promise.resolve(true);
        },
      });
      Object.defineProperty(PushManager.prototype, 'subscribe', {
        configurable: true,
        value: () => {
          localStorage.setItem(storage, 'on');
          return Promise.resolve(subscription());
        },
      });
      Object.defineProperty(PushManager.prototype, 'getSubscription', {
        configurable: true,
        value: () => Promise.resolve(localStorage.getItem(storage) ? subscription() : null),
      });
    },
    { endpoint },
  );
}
async function memberLogin(page: Page) {
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill('User@2026');
  const response = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/auth/login' && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const login = loginResponseSchema.parse(await (await response).json());
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
  return login.accessToken;
}

for (const width of [1440, 390]) {
  test(`D-137 Portal push preferences and PWA manifest at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const endpoint = `${STUB}/push/816-member-${randomUUID()}`;
    let admin = '',
      appBefore: unknown;
    if (onServer) {
      await browserDevice(page, endpoint);
      admin = await settingsLogin(page);
      appBefore = (await (
        await page.request.get(`${ADMIN_URL}/v1/admin/settings/app`, {
          headers: { authorization: `Bearer ${admin}` },
        })
      ).json()) as unknown;
      await settingsFixture(page, admin, 'app', DEFAULT_APP_NOTIFY, 'PATCH');
    }
    const token = await memberLogin(page);
    const headers = { authorization: `Bearer ${token}` };
    let previous = DEFAULT_APP_NOTIFY.push;
    if (onServer)
      previous = pushPreferencesSchema.parse(
        await (await page.request.get(`${PORTAL_URL}/v1/push/preferences`, { headers })).json(),
      );
    try {
      await page.goto(`${PORTAL_URL}/profile?tab=notifications`);
      await expect(page.getByRole('tab', { name: 'Thông báo', exact: true })).toBeVisible();
      const event = page.getByRole('switch', { name: 'Sự kiện sắp diễn ra', exact: true });
      await expect(event).toBeEnabled();
      if (onServer) {
        await page
          .getByRole('button', { name: 'Bật thông báo trên thiết bị này', exact: true })
          .click();
        await expect(page.getByText('Đang bật trên thiết bị này', { exact: true })).toBeVisible();
      } else {
        expect(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toContain(
          'mockServiceWorker.js',
        );
        expect(
          await page.evaluate(async () =>
            (await navigator.serviceWorker.getRegistrations()).some((r) =>
              r.active?.scriptURL.endsWith('/sw.js'),
            ),
          ),
        ).toBe(false);
      }
      if (await event.isChecked()) await event.click();
      await expect(event).not.toBeChecked();
      await page.reload();
      await expect(event).not.toBeChecked();
      await expect(
        page.getByRole('switch', { name: 'Lượt xem & liên hệ gian hàng', exact: true }),
      ).toBeDisabled();
      const manifest = z
        .object({
          name: z.literal('OPC Hub'),
          start_url: z.literal('/dashboard'),
          display: z.literal('standalone'),
          icons: z.array(z.object({ src: z.string(), sizes: z.string() })).length(3),
        })
        .parse(await (await page.request.get(`${PORTAL_URL}/manifest.webmanifest`)).json());
      expect(manifest.icons.map((icon) => icon.sizes)).toEqual(['192x192', '512x512', '512x512']);
      await test.info().attach(`push-preferences-${width}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });
    } finally {
      if (onServer) {
        await page.request.delete(`${PORTAL_URL}/v1/push/subscriptions`, {
          headers,
          data: { endpoint },
        });
        await page.request.put(`${PORTAL_URL}/v1/push/preferences`, { headers, data: previous });
        await settingsFixture(page, admin, 'app', appBefore, 'PATCH');
      }
    }
  });
}

test('D-137 Admin real outbox -> fake HTTP push; 503 retry does not resend successful device', async ({
  page,
}) => {
  test.skip(
    !onServer,
    'Physical stub delivery is verified only against the private native runtime',
  );
  const path = `/push/816-admin-${randomUUID()}`,
    retryPath = `${path}-retry`,
    endpoint = STUB + path;
  await browserDevice(page, endpoint);
  const token = await settingsLogin(page),
    headers = { authorization: `Bearer ${token}` };
  const previous = (await (
    await page.request.get(`${ADMIN_URL}/v1/admin/settings/app`, { headers })
  ).json()) as unknown;
  try {
    await settingsFixture(page, token, 'app', DEFAULT_APP_NOTIFY, 'PATCH');
    await page.goto(`${ADMIN_URL}/settings?tab=app`);
    await page
      .getByRole('button', { name: 'Bật thông báo trên thiết bị này', exact: true })
      .click();
    await expect(page.getByText('Đang bật trên thiết bị này', { exact: true })).toBeVisible();
    await test.info().attach('admin-push-device', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
    expect(
      (
        await page.request.post(`${ADMIN_URL}/v1/push/subscriptions`, {
          headers,
          data: { endpoint: STUB + retryPath, keys: { p256dh: 'test-p256dh', auth: 'test-auth' } },
        })
      ).status(),
    ).toBe(201);
    expect(
      (
        await page.request.post(`${STUB}/__stub/mode`, {
          data: { path: retryPath, statuses: [503, 201] },
        })
      ).status(),
    ).toBe(200);
    await page.getByRole('button', { name: 'Gửi thông báo thử', exact: true }).click();
    await expect(page.getByText('Đã gửi tới 2 thiết bị', { exact: true })).toBeVisible();
    const resultSchema = z.object({
      messages: z.array(
        z.object({
          payload: pushPayloadSchema,
          options: z.object({ urgency: z.literal('high'), ttl: z.literal(86400) }),
          status: z.number(),
        }),
      ),
    });
    const records = async (which: string) =>
      resultSchema.parse(
        await (
          await page.request.get(`${STUB}/__stub/messages?path=${encodeURIComponent(which)}`)
        ).json(),
      ).messages;
    await expect
      .poll(async () => (await records(retryPath)).map((r) => r.status))
      .toEqual([503, 201]);
    const good = await records(path),
      retry = await records(retryPath);
    expect(good).toHaveLength(1);
    expect(good[0]?.payload.tag).toBe(retry[0]?.payload.tag);
    expect(good[0]?.payload.title).toBe('Thông báo thử từ OPC Hub');
  } finally {
    for (const value of [endpoint, STUB + retryPath])
      await page.request.delete(`${ADMIN_URL}/v1/push/subscriptions`, {
        headers,
        data: { endpoint: value },
      });
    await settingsFixture(page, token, 'app', previous, 'PATCH');
  }
});
