import { describe, expect, it } from 'vitest';
import { KeywordMatcher } from './aho-corasick';

describe('KeywordMatcher (Aho–Corasick, S-08)', () => {
  const m = new KeywordMatcher(['chuyển khoản trước', 'vay nóng', 'số CCCD', 'he', 'she', 'hers']);

  it('khớp không phân biệt hoa thường, trả đoạn gốc', () => {
    expect(m.firstHit('Anh ơi CHUYỂN KHOẢN TRƯỚC giúp em')).toBe('CHUYỂN KHOẢN TRƯỚC');
    expect(m.firstHit('cho mình xin Số cccd nhé')).toBe('Số cccd');
  });

  it('khớp từ khoá là hậu tố của từ khác (liên kết lỗi)', () => {
    expect(m.firstHit('ushers')).toBe('she');
    expect(m.firstHit('ahe')).toBe('he');
  });

  it('không khớp → null; danh sách rỗng không lỗi', () => {
    expect(m.firstHit('Chào cả nhà, tuần này đi Meetup không?')).toBeNull();
    expect(new KeywordMatcher([]).firstHit('vay nóng')).toBeNull();
  });

  it('nhiều từ khoá trong một câu → từ kết thúc sớm nhất', () => {
    expect(m.firstHit('cần vay nóng, chuyển khoản trước')).toBe('vay nóng');
  });
});
