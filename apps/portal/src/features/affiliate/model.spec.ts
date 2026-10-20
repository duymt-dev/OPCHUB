import { describe, expect, it } from 'vitest';
import {
  affiliateUrlSchema,
  endOfMonth,
  lastPage,
  monthKey,
  monthLabel,
  shareLinks,
  toHolder,
} from './model';

describe('Affiliate Portal model', () => {
  it('REQ-309 tên chủ TK in hoa không dấu và không nhận ký tự ngoài chữ/khoảng trắng', () => {
    expect(toHolder('nguyễn văn an')).toBe('NGUYEN VAN AN');
    expect(toHolder('Đặng Thị Hà 123!')).toBe('DANG THI HA ');
    expect(toHolder('LE  THU HA')).toBe('LE  THU HA');
  });
  it('REQ-311 link chia sẻ encode URL và subject, không chèn query người dùng', () => {
    const link = 'https://opchub.community/r/HAOPC?from=a&b=1';
    const links = shareLinks(link, 'Mời bạn tham gia');
    expect(new URL(links.facebook).searchParams.get('u')).toBe(link);
    expect(new URL(links.zalo).searchParams.get('url')).toBe(link);
    expect(new URL(links.email).searchParams.get('subject')).toBe('Mời bạn tham gia');
    expect(new URL(links.email).searchParams.get('body')).toBe(link);
  });
  it('REQ-311 bộ lọc URL giữ tháng/trang/tab, dữ liệu sai rơi về mặc định', () => {
    expect(affiliateUrlSchema.parse({ tab: 'hist', month: '2026-09', page: '2' })).toEqual({
      tab: 'hist',
      month: '2026-09',
      page: 2,
    });
    expect(affiliateUrlSchema.parse({ tab: 'bad', month: '2026-13', page: '-2' })).toEqual({
      tab: 'ref',
      month: '',
      page: 1,
    });
    expect(affiliateUrlSchema.parse({})).toEqual({ tab: 'ref', month: '', page: 1 });
  });
  it('REQ-311 tháng theo giờ Việt Nam, cuối tháng đúng năm nhuận và giao năm', () => {
    expect(monthKey(Date.parse('2026-09-30T18:00:00Z'))).toBe('2026-10');
    expect(monthLabel('2026-10')).toBe('10/2026');
    expect(endOfMonth('2028-02')).toBe('2028-02-29T00:00:00.000Z');
    expect(endOfMonth('2026-12')).toBe('2026-12-31T00:00:00.000Z');
  });
  it('REQ-311 phân trang server co về trang cuối khi dữ liệu giảm, kể cả rỗng', () => {
    expect(lastPage(13)).toBe(3);
    expect(lastPage(6)).toBe(1);
    expect(lastPage(0)).toBe(1);
  });
});
