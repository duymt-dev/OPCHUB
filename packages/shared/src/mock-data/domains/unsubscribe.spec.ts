import { beforeEach, describe, expect, it } from 'vitest';
import { canResendMail, maskEmail, unsubscribeSchema } from '../../api-domains';
import { auditLog } from './group-admin';
import { cancelCampaign, listCampaigns } from './marketing';
import { resetMockDb } from './store';
import {
  signUnsubscribeToken,
  suppressions,
  unsubscribeEmail,
  verifyUnsubscribeToken,
} from './unsubscribe';

beforeEach(() => resetMockDb());

describe('BUG-036 huỷ nhận + dừng chiến dịch (mock)', () => {
  it('BUG-036 token ký / kiểm; sửa 1 ký tự → null; đúng định dạng zod', async () => {
    const t = await signUnsubscribeToken('An.Nguyen@MediaSoft.vn');
    expect(unsubscribeSchema.safeParse({ token: t }).success).toBe(true);
    expect(await verifyUnsubscribeToken(t)).toBe('an.nguyen@mediasoft.vn');
    const bad = `${t.slice(0, -1)}${t.endsWith('0') ? '1' : '0'}`;
    expect(await verifyUnsubscribeToken(bad)).toBeNull();
    expect(unsubscribeSchema.safeParse({ token: 'abc' }).success).toBe(false);
  });

  it('BUG-036 che email; idempotent', () => {
    expect(maskEmail('an.nguyen@mediasoft.vn')).toBe('an***@mediasoft.vn');
    expect(maskEmail('a@x.vn')).toBe('a***@x.vn');
    unsubscribeEmail('a@x.vn');
    unsubscribeEmail('A@x.vn');
    expect([...suppressions()]).toEqual(['a@x.vn']);
  });

  it('BUG-036 dừng: chỉ sending | scheduled, lần hai 409, ghi audit', () => {
    const r = cancelCampaign('admin', 'cp2');
    expect(r.ok && r.data.status).toBe('cancelled');
    const again = cancelCampaign('admin', 'cp2');
    expect(!again.ok && again.status).toBe(409);
    const sent = cancelCampaign('admin', 'cp1');
    expect(!sent.ok && sent.status).toBe(409);
    expect(listCampaigns().find((c) => c.id === 'cp2')?.status).toBe('cancelled');
    expect(auditLog()[0]).toMatchObject({ action: 'campaign.cancel', target: 'cp2' });
  });

  it('REQ-205 gửi lại: đã gửi (chào mừng/chiến dịch) hoặc lỗi trừ OTP/đặt lại MK', () => {
    expect(canResendMail({ kind: 'welcome', status: 'sent' })).toBe(true);
    expect(canResendMail({ kind: 'otp', status: 'sent' })).toBe(false);
    expect(canResendMail({ kind: 'fee_reminder', status: 'failed' })).toBe(true);
    expect(canResendMail({ kind: 'otp', status: 'failed' })).toBe(false);
    expect(canResendMail({ kind: 'password_reset', status: 'failed' })).toBe(false);
    expect(canResendMail({ kind: 'campaign', status: 'cancelled' })).toBe(false);
  });
});
