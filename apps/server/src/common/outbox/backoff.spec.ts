import { describe, expect, it } from 'vitest';
import { backoffSec, MAX_BACKOFF_SEC } from './backoff';

describe('backoffSec', () => {
  it('TD-019 backoff tăng gấp đôi, trần 300 giây', () => {
    expect([1, 2, 3, 4, 8].map(backoffSec)).toEqual([2, 4, 8, 16, 256]);
    expect(backoffSec(9)).toBe(MAX_BACKOFF_SEC);
    expect(backoffSec(50)).toBe(MAX_BACKOFF_SEC);
  });

  it('attempts không hợp lệ coi như lần lỗi đầu', () => {
    expect(backoffSec(0)).toBe(2);
    expect(backoffSec(-3)).toBe(2);
  });
});
