import { describe, expect, it } from 'vitest';
import { planOf } from './plans';

describe('Gói theo loại tài khoản (D-68)', () => {
  it('gói theo loại TK; nhà đầu tư không có gói (D-14)', () => {
    expect(planOf('personal')).toBe('personal');
    expect(planOf('business')).toBe('business');
    expect(planOf('investor')).toBeNull();
  });
});
