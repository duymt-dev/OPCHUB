import { describe, expect, it } from 'vitest';
import { AppError } from '@/common/errors';
import {
  assertTransition,
  canTransition,
  INVESTOR_TRANSITIONS,
  statusesBefore,
} from './interest-status';

describe('interest-status (TIP-V2-107)', () => {
  it('BUG-007 §9 chỉ đi tiến sent→in_discussion→connected', () => {
    expect(INVESTOR_TRANSITIONS).toEqual({
      sent: ['in_discussion'],
      in_discussion: ['connected'],
      connected: [],
    });
    expect(canTransition('sent', 'in_discussion')).toBe(true);
    expect(canTransition('in_discussion', 'connected')).toBe(true);
    expect(statusesBefore('connected')).toEqual(['sent', 'in_discussion']);
    expect(statusesBefore('in_discussion')).toEqual(['sent']);
  });

  it('BUG-007 chặn lùi và nhảy cóc', () => {
    expect(canTransition('connected', 'sent')).toBe(false);
    expect(canTransition('connected', 'in_discussion')).toBe(false);
    expect(canTransition('in_discussion', 'sent')).toBe(false);
    expect(canTransition('sent', 'connected')).toBe(false);
    expect(canTransition('sent', 'sent')).toBe(false);
    expect(() => assertTransition('connected', 'sent')).toThrow(AppError);
    expect(() => assertTransition('sent', 'connected')).toThrow(
      'Không thể chuyển trạng thái từ Đã gửi sang Đã kết nối',
    );
  });
});
