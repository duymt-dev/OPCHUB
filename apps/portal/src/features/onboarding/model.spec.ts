import type { Onboarding } from '@opchub/shared/api-domains';
import { describe, expect, it } from 'vitest';
import { dayPartOf, firstNameOf, progressPct, stepRows, vnClock } from './model';

const KEYS = ['pay', 'prof', 'grp', 'chat', 'st', 'nd', 'aff', 'ev'] as const;
const of = (done: boolean[], paid = true): Onboarding => ({
  accountType: 'business',
  paid,
  done: done.filter(Boolean).length,
  total: 8,
  steps: KEYS.map((key, i) => ({ key, done: !!done[i], locked: key !== 'pay' && !paid })),
  fundraising: null,
});

describe('onboarding model (V4-611)', () => {
  it('bước kế tiếp = bước chưa xong đầu tiên; còn lại "todo"', () => {
    const rows = stepRows(of([true, false, true, true, true, true, false, true]));
    expect(rows.map((r) => r.state)).toEqual([
      'done',
      'next',
      'done',
      'done',
      'done',
      'done',
      'todo',
      'done',
    ]);
    expect(rows[1]).toMatchObject({ key: 'prof', n: 2 });
    expect(progressPct(of([true, false, true, true, true, true, false, true]))).toBe(75);
  });

  it('chưa đóng phí: bước 1 là kế tiếp, 2–8 khoá', () => {
    const rows = stepRows(of([], false));
    expect(rows[0]?.state).toBe('next');
    expect(rows.slice(1).every((r) => r.state === 'locked')).toBe(true);
  });

  it('lời chào theo giờ + ngày giờ Việt Nam + tên gọi', () => {
    expect([10, 11, 13, 14, 17, 18].map(dayPartOf)).toEqual([
      'morning',
      'noon',
      'noon',
      'afternoon',
      'afternoon',
      'evening',
    ]);
    // 16/10/2026 09:00 giờ VN = 02:00 UTC, thứ Sáu
    expect(vnClock(Date.UTC(2026, 9, 16, 2, 0))).toEqual({ dow: 5, date: '16/10/2026', hour: 9 });
    expect(vnClock(Date.UTC(2026, 9, 17, 18, 30))).toEqual({ dow: 0, date: '18/10/2026', hour: 1 });
    expect(firstNameOf('Nguyễn Văn An')).toBe('An');
  });
});
