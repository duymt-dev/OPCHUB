import { beforeEach, describe, expect, it } from 'vitest';
import { autoRemindMockOnboarding } from './onboarding-auto';
import { mockDb, resetMockDb } from './store';

const notes = (userId: string) =>
  (mockDb().notifications.get(userId) ?? []).filter((n) => n.title.includes('bước khởi đầu'));

describe('mock tự nhắc khởi đầu (TIP-V42-708, D-100 / D-115)', () => {
  beforeEach(() => resetMockDb());

  it('M1 thiếu 2 bước: seed đã nhắc ngày demo; ngày VN sau → một thông báo, gọi lại trong ngày → không', () => {
    expect(autoRemindMockOnboarding('m1')).toEqual({ reminded: false });
    expect(notes('m1')).toHaveLength(0);
    const now = Date.parse('2026-10-28T03:00:00Z');
    expect(autoRemindMockOnboarding('m1', now)).toEqual({ reminded: true });
    expect(autoRemindMockOnboarding('m1', now + 3_600_000)).toEqual({ reminded: false });
    expect(notes('m1')).toHaveLength(1);
    expect(notes('m1')[0]).toMatchObject({
      type: 'system',
      title: 'Bạn còn 2 bước khởi đầu chưa hoàn tất',
      link: '/dashboard',
    });
    // 17:00Z = 00:00 VN hôm sau
    expect(autoRemindMockOnboarding('m1', Date.parse('2026-10-28T17:00:00Z'))).toEqual({
      reminded: true,
    });
    expect(notes('m1')).toHaveLength(2);
  });

  it('TK không có onboarding (NĐT / không tồn tại) → không nhắc', () => {
    expect(autoRemindMockOnboarding('khong-co')).toEqual({ reminded: false });
  });
});
