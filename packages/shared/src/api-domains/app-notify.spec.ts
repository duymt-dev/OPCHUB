import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_NOTIFY, appNotifyPatchSchema, appNotifySettingsSchema } from './app-notify';
describe('REQ-629 configuration only', () => {
  it('defaults PWA and four kinds on, store digest off', () => {
    expect(appNotifySettingsSchema.parse(DEFAULT_APP_NOTIFY)).toEqual({
      pwa: true,
      push: { msg: true, need: true, renew: true, event: true, store: false },
    });
  });
  it('accepts partial nested updates and rejects unknown or non-boolean fields', () => {
    expect(appNotifyPatchSchema.parse({ push: { msg: false } })).toEqual({ push: { msg: false } });
    for (const body of [{ zalo: true }, { push: { unknown: true } }, { pwa: 1 }])
      expect(appNotifyPatchSchema.safeParse(body).success).toBe(false);
  });
});
