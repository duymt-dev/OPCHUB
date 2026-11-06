import { describe, expect, it } from 'vitest';
import { regionalRevokedMail } from './templates-regional';

describe('TC-462 BR-464 regional revocation mail', () => {
  const revokedAt = '2026-11-06T00:00:00.000Z';

  it.each([
    ['north', 'Miền Bắc'],
    ['central', 'Miền Trung'],
    ['south', 'Miền Nam'],
  ] as const)('retains the %s label and previous-fee expiry in Vietnam time', (region, label) => {
    const mail = regionalRevokedMail(region, '2026-12-16T18:00:00.000Z', revokedAt);
    expect(mail.subject).toContain(label);
    expect(mail.subject).toContain('17/12/2026');
    expect(mail.subject).not.toContain('vui lòng đóng phí');
    expect(mail.text).toContain('Phí thành viên cũ còn hiệu lực đến 17/12/2026');
    expect(mail.html).toContain('17/12/2026');
    expect(mail.text).toContain('Chia sẻ đã ghi nhận vẫn được chi.');
  });

  it('retains the original payment request when there is no remaining fee', () => {
    const mail = regionalRevokedMail('south', null, revokedAt);
    expect(mail.subject).toBe(
      '[OPC Hub] Kết thúc vai trò GĐ Vùng Miền Nam · vui lòng đóng phí thành viên',
    );
    expect(mail.text).toContain('Vui lòng đóng phí thành viên để tiếp tục sử dụng.');
    expect(mail.html).not.toContain('còn hiệu lực đến');
  });
});
