import { describe, expect, it } from 'vitest';
import { KeywordMatcher } from './keyword-matcher';
import { KEYWORD_REASON } from './keyword-reason';

describe('NA-07 shared native/MSW matcher semantics', () => {
  it('preserves original case while matching NFC/decomposed Vietnamese', () => {
    const matcher = new KeywordMatcher(['số CCCD', 'vay nóng']);
    expect(matcher.firstHit('Xin SỐ CCCD nhé'.normalize('NFD'))).toBe('SỐ CCCD');
    expect(matcher.firstHit('Cần VAY NÓNG')).toBe('VAY NÓNG');
  });
  it('returns the earliest finishing hit and inherited suffix without a per-word scan', () => {
    const matcher = new KeywordMatcher(['he', 'she', 'hers', 'vay nóng']);
    expect(matcher.firstHit('ushers rồi vay nóng')).toBe('she');
    expect(matcher.firstHit('ahe')).toBe('he');
  });
  it('empty/blank dictionaries and no-match text return null', () => {
    expect(new KeywordMatcher(['', ' ']).firstHit('any body')).toBeNull();
    expect(new KeywordMatcher(['vay nóng']).firstHit('Trao đổi hợp tác')).toBeNull();
  });
  it('uses the exact seven native auto-report reason categories; custom words remain unclassified', () => {
    expect(KEYWORD_REASON).toEqual({
      'chuyển khoản trước': 'scam',
      'vay nóng': 'scam',
      'kiếm tiền nhanh': 'scam',
      'bán tài khoản': 'spam',
      'số cccd': 'personal_info',
      'mật khẩu': 'personal_info',
      'đồ ngu': 'abuse',
    });
    expect(KEYWORD_REASON['custom keyword']).toBeUndefined();
  });
});
