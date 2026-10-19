import { describe, expect, it } from 'vitest';
import { formatDate, formatVnd, isMandatory, shortName, viewOfPath } from './model';

describe('membership/model', () => {
  it('BR-03: chưa thanh toán / hết hạn → bắt buộc', () => {
    expect(isMandatory('pending_payment')).toBe(true);
    expect(isMandatory('expired')).toBe(true);
    expect(isMandatory('active')).toBe(false);
    expect(isMandatory('expiring')).toBe(false);
    expect(isMandatory(undefined)).toBe(false);
  });

  it('BUG-018 D-57 isMandatory theo validUntil (tab mở qua mốc hết hạn)', () => {
    const now = Date.parse('2026-10-19T03:00:00.000Z');
    expect(isMandatory('active', '2026-10-19T02:59:00.000Z', now)).toBe(true);
    expect(isMandatory('expiring', '2026-10-19T03:00:00.000Z', now)).toBe(true);
    expect(isMandatory('expiring', '2026-10-22T03:00:00.000Z', now)).toBe(false);
    expect(isMandatory('active', null, now)).toBe(false);
    expect(isMandatory('pending_payment', '2027-01-01T00:00:00.000Z', now)).toBe(true);
  });

  it('tiền VND + ngày giờ Việt Nam', () => {
    expect(formatVnd(600000)).toBe('600.000đ');
    expect(formatDate('2027-10-15T17:30:00.000Z')).toBe('16/10/2027');
    expect(formatDate(null)).toBe('—');
  });

  it('lời chào lấy 2 chữ cuối của tên', () => {
    expect(shortName('Nguyễn Văn An')).toBe('Văn An');
  });

  it('URL → bước của hộp', () => {
    expect(viewOfPath('/services')).toEqual({ view: 'list' });
    expect(viewOfPath('/services/ai30/request')).toEqual({ view: 'form', svcId: 'ai30' });
    expect(viewOfPath('/services/requests/YC-1006')).toEqual({ view: 'done', code: 'YC-1006' });
    expect(viewOfPath('/membership/pay')).toEqual({ view: 'pay' });
    expect(viewOfPath('/dashboard')).toBeNull();
  });
});
