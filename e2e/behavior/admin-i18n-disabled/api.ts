import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { languageSettingsSchema, type LanguageSettings } from '@opchub/shared/api-domains';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type { DisabledAudit } from './fixtures';

/** Only this existing API and the one approved toggle; never a broad configuration write. */
export async function languages(
  page: Page,
  token: string,
  toggle?: { code: string; enabled: boolean },
) {
  const result = await page.evaluate(
    async ({ token, toggle }) => {
      const r = await fetch('/v1/admin/settings/languages', {
        method: toggle ? 'PATCH' : 'GET',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(toggle ? { body: JSON.stringify({ toggle }) } : {}),
      });
      return { status: r.status, body: (await r.json()) as unknown };
    },
    { token, toggle },
  );
  expect(result.status, 'Existing Settings API succeeds').toBe(200);
  return languageSettingsSchema.parse(result.body);
}

export function disabled(original: LanguageSettings, code: string): LanguageSettings {
  return {
    ...original,
    items: original.items.map((i) => (i.code === code ? { ...i, enabled: false } : i)),
  };
}

export const fingerprint = (value: LanguageSettings) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Fresh conditional read before narrow restoration; never overwrite unrelated drift. */
export async function restore(
  page: Page,
  token: string,
  original: LanguageSettings,
  changed: LanguageSettings,
  code: string,
  audit: DisabledAudit,
) {
  const current = await languages(page, token);
  const alreadyOriginal = isDeepStrictEqual(current, original);
  if (!alreadyOriginal) {
    expect(current, 'Refuse restoration across unrelated configuration drift').toEqual(changed);
    audit.expectToggle(code, true);
    expect(await languages(page, token, { code, enabled: true })).toEqual(original);
  }
  const restored = await languages(page, token);
  expect(restored, 'Full default/enabled/progress snapshot restored').toEqual(original);
  return { alreadyOriginal, before: fingerprint(original), after: fingerprint(restored) };
}
