import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const waitApi = (page: Page, path: string, status = 200) => {
  const pending = page
    .waitForResponse((r) => new URL(r.url()).pathname === `/v1/admin/${path}`)
    .then((r) => {
      expect(r.status(), `Exact API prerequisite: ${path}`).toBe(status);
      return r;
    });
  void pending.catch(() => undefined);
  return pending;
};
/** Existing browser API, no intercept, DB helper, app-store token extraction or credential logs. */
export async function browserApi(page: Page, token: string, path: string, body?: unknown) {
  return page.evaluate(
    async ({ token, path, body }) => {
      const response = await fetch(`/v1/admin/${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: (await response.json()) as unknown };
    },
    { token, path, body },
  );
}
