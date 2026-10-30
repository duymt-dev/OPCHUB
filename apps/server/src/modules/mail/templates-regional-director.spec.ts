import { describe, expect, it } from 'vitest';
import { directorAppointedMail, directorRevokedMail } from './templates-regional-director';

describe('REQ-616 BR-464 director emails', () => {
  it('EM-GDV1 escapes member/provinces, links to actual configured login and contains no password', () => {
    const mail = directorAppointedMail(
      '<script>name</script>',
      'central',
      ['<b>province</b>'],
      'https://portal.example.test',
    );
    expect(mail.html).toContain('&lt;script&gt;name&lt;/script&gt;');
    expect(mail.html).toContain('&lt;b&gt;province&lt;/b&gt;');
    expect(mail.html).toContain('https://portal.example.test/login');
    expect(mail.text).toContain('Trung & Tây Nguyên');
    expect(mail.html).not.toMatch(/mật khẩu|password/i);
  });
  it('EM-GDV2 names the retained trial expiry and historical entitlement without granting a new term', () => {
    const mail = directorRevokedMail(
      'Name',
      'north',
      new Date('2026-10-30T01:00:00Z'),
      { status: 'trial', validUntil: new Date('2026-11-08T00:00:00Z') },
      'https://portal.example.test',
    );
    expect(mail.text).toContain('08/11/2026');
    expect(mail.text).toContain('dùng thử');
    expect(mail.text).toContain('vẫn được chi trả');
    expect(mail.text).toContain('08:00:00');
    expect(mail.html).not.toMatch(/mật khẩu|password/i);
  });
  it('AT-GDV02 EM-GDV2 requires payment after the original term expired', () => {
    const mail = directorRevokedMail(
      'Name',
      'south',
      new Date('2026-10-30T00:00:00Z'),
      { status: 'pending_payment', validUntil: null },
      'https://portal.example.test',
    );
    expect(mail.text).toContain('Vui lòng thanh toán');
    expect(mail.text).not.toContain('được giữ nguyên đến');
  });
});
