import { readFileSync } from 'node:fs';
import { test as base, expect, type Page, type Response } from '@playwright/test';
import { z } from 'zod';
import { requirePrivateNative } from '../admin-i18n/fixtures';

export { expect };
export type { Page };

export const CONTRACT_ROLE_NAME = 'tip824-i18n-role';
export const CONTRACT_ACCOUNT_PREFIX = 'tip824-ro-';

const ALLOWED_MUTATIONS = [
  /^POST \/v1\/admin\/auth\/(login|refresh|logout|first-password)$/,
  /^POST \/v1\/admin\/admin-roles$/,
  /^PUT \/v1\/admin\/admin-roles\/permissions$/,
  /^POST \/v1\/admin\/admin-accounts$/,
] as const;

export interface ContractAudit {
  requests: string[];
  mutations: string[];
  settle: () => Promise<void>;
}

export const test = base.extend<{ audit: ContractAudit }>({
  audit: [
    async ({ page }, use) => {
      requirePrivateNative();
      const errors: string[] = [];
      const requests: string[] = [];
      const mutations: string[] = [];
      const unexpectedMutations: string[] = [];

      page.on('pageerror', (err) => errors.push(err.message));
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        // Expected 401/403/409 status responses tested explicitly in boundary checks emit browser resource logs.
        if (/status of (401|403|409)/.test(text)) return;
        errors.push(text);
      });
      page.on('request', (req) => {
        const path = new URL(req.url()).pathname;
        if (!path.startsWith('/v1/')) return;
        const entry = `${req.method()} ${path}`;
        requests.push(entry);
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method())) return;
        mutations.push(entry);
        if (!ALLOWED_MUTATIONS.some((rx) => rx.test(entry))) {
          unexpectedMutations.push(entry);
        }
      });

      const settle = async () => {
        await page.waitForLoadState('networkidle');
      };

      await use({ requests, mutations, settle });
      await settle();
      expect(unexpectedMutations, 'No unapproved API writes or exports').toEqual([]);
      expect(errors, 'No hydration, Intl, or runtime browser errors').toEqual([]);
    },
    { auto: true },
  ],
});

export function waitApiResponse(page: Page, path: string, method = 'GET', status = 200) {
  const pending = page
    .waitForResponse(
      (r: Response) => new URL(r.url()).pathname === path && r.request().method() === method,
    )
    .then((res) => {
      expect(res.status(), `Expected ${method} ${path} -> ${status}`).toBe(status);
      return res;
    });
  void pending.catch(() => undefined);
  return pending;
}

export async function authedJson(page: Page, token: string, path: string, body?: unknown) {
  return page.evaluate(
    async ({ token, path, body }) => {
      const response = await fetch(path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: (await response.json()) as unknown };
    },
    { token, path, body },
  );
}

const text = z.string().min(1);
export function readBundleJson(bundle: 'en' | 'my' | 'vi', file: string): unknown {
  return JSON.parse(
    readFileSync(
      new URL(`../../../apps/admin/messages/${bundle}/${file}.json`, import.meta.url),
      'utf8',
    ),
  ) as unknown;
}
export { text };
