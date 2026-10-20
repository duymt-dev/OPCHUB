import { afterEach, describe, expect, it, vi } from 'vitest';
import * as api from './referral-api';
import { prepareSsoReferral } from './referral-session';
import type { AffiliateCodeResult } from '@opchub/shared/api-domains';

afterEach(() => {
  vi.restoreAllMocks();
  document.cookie = 'opc_ref=; Max-Age=0; Path=/';
});
describe('SSO referral continuity', () => {
  it('REQ-303 preserve validated manual code with policy TTL, clear removes stale attribution', async () => {
    vi.spyOn(api, 'checkReferralCode').mockResolvedValue({
      valid: true,
      affiliateName: 'Owner',
      cookieDays: 45,
    });
    await prepareSsoReferral('OPCAN26');
    expect(document.cookie).toContain('opc_ref=OPCAN26');
    await prepareSsoReferral('');
    expect(document.cookie).not.toContain('opc_ref=');
  });
  it('REQ-304 invalid/paused code rejects SSO preflight without storing it', async () => {
    vi.spyOn(api, 'checkReferralCode').mockResolvedValue({
      valid: false,
      reason: 'paused',
      message: 'Mã đang tạm dừng',
    });
    await expect(prepareSsoReferral('PAUSED')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      fields: [{ path: 'referralCode', message: 'Mã đang tạm dừng' }],
    });
    expect(document.cookie).not.toContain('opc_ref=');
  });
  it('REQ-303 canceled provider navigation cannot overwrite a later chosen code', async () => {
    let resolve: (value: AffiliateCodeResult) => void = () => {
      throw new Error('Not started');
    };
    vi.spyOn(api, 'checkReferralCode').mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const controller = new AbortController();
    const promise = prepareSsoReferral('OLD1', controller.signal);
    controller.abort();
    document.cookie = 'opc_ref=NEW2; Path=/';
    resolve({ valid: true, affiliateName: 'Old owner', cookieDays: 30 });
    await promise;
    expect(document.cookie).toContain('opc_ref=NEW2');
  });
});
