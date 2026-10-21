import { describe, expect, it } from 'vitest';
import { loadMessages, messages, overlay } from './messages';

describe('overlay — bản dịch đè lên vi (D-65)', () => {
  it('giữ mảng là mảng (t.raw(...).map) và dịch từng phần tử', () => {
    expect(overlay({ a: ['x', 'y'] }, { a: ['X', ''] })).toEqual({ a: ['X', 'y'] });
  });

  it('mảng khác độ dài hoặc sai kiểu → lấy mảng vi', () => {
    expect(overlay({ a: ['x', 'y'] }, { a: ['X'] })).toEqual({ a: ['x', 'y'] });
    expect(overlay({ a: ['x'] }, { a: { 0: 'X' } })).toEqual({ a: ['x'] });
  });

  it('khoá thiếu / rỗng → vi', () => {
    expect(overlay({ a: 'x', b: { c: 'y' } }, { b: {} })).toEqual({ a: 'x', b: { c: 'y' } });
  });

  it('bộ en nạp được, mảng t.raw vẫn là mảng', async () => {
    const en = await loadMessages('en');
    expect(Array.isArray(en.membership.plan.benefits)).toBe(true);
    expect(en.membership.plan.benefits).not.toEqual(messages.membership.plan.benefits);
    expect(Array.isArray(en.profile.options.fields)).toBe(true);
  });
});
