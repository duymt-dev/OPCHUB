import { describe, expect, it } from 'vitest';
import { ASSISTANT_OPEN_KEY, nextAccordion, readOpen, writeOpen } from './model';

describe('Trợ lý OPC Hub — model', () => {
  it('nhớ đóng / mở; storage lỗi hoặc không có → đóng, không ném lỗi', () => {
    const m = new Map<string, string>();
    const s = {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => m.set(k, v),
    };
    expect(readOpen(s)).toBe(false);
    writeOpen(s, true);
    expect(m.get(ASSISTANT_OPEN_KEY)).toBe('1');
    expect(readOpen(s)).toBe(true);
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readOpen(broken)).toBe(false);
    expect(() => writeOpen(broken, true)).not.toThrow();
    expect(readOpen(undefined)).toBe(false);
  });

  it('accordion: mở mục khác thay mục cũ, bấm lại thì đóng', () => {
    expect(nextAccordion(null, 'fund')).toBe('fund');
    expect(nextAccordion('fund', 'train')).toBe('train');
    expect(nextAccordion('train', 'train')).toBeNull();
  });
});
