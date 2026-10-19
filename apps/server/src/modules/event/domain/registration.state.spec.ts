import { describe, expect, it } from 'vitest';
import {
  canReRegister,
  canTransitionRegistration,
  canUndoCheckIn,
  registrationEdge,
} from './registration.state';

const now = new Date('2030-10-10T00:00:00Z');
const later = new Date('2030-10-20T00:00:00Z');
const past = new Date('2030-10-01T00:00:00Z');

describe('BUG-041 máy trạng thái đăng ký sự kiện (§9)', () => {
  it('BUG-041 §9 registered → attended | cancelled', () => {
    expect(canTransitionRegistration('registered', 'attended')).toBe(true);
    expect(canTransitionRegistration('registered', 'cancelled')).toBe(true);
  });

  it('BUG-041 EV-R05 attended → cancelled bị chặn; cancelled → attended bị chặn', () => {
    expect(canTransitionRegistration('attended', 'cancelled')).toBe(false);
    expect(canTransitionRegistration('cancelled', 'attended')).toBe(false);
    expect(() => registrationEdge('attended', 'cancelled')).toThrow();
    expect(() => registrationEdge('cancelled', 'attended')).toThrow();
  });

  it('BUG-041 NA-23 đăng ký lại sau huỷ chỉ khi còn mở và chưa tới giờ', () => {
    expect(registrationEdge('cancelled', 'registered')).toEqual({
      from: 'cancelled',
      to: 'registered',
    });
    expect(canReRegister({ registrationOpen: true, startsAt: later }, now)).toBe(true);
    expect(canReRegister({ registrationOpen: false, startsAt: later }, now)).toBe(false);
    expect(canReRegister({ registrationOpen: true, startsAt: past }, now)).toBe(false);
  });

  it('BUG-041 bỏ check-in nhầm chỉ trước khi sự kiện kết thúc', () => {
    expect(canTransitionRegistration('attended', 'registered')).toBe(true);
    expect(canUndoCheckIn({ startsAt: later, endsAt: null }, now)).toBe(true);
    expect(canUndoCheckIn({ startsAt: past, endsAt: new Date('2030-10-11T00:00:00Z') }, now)).toBe(
      true,
    );
    expect(canUndoCheckIn({ startsAt: past, endsAt: null }, now)).toBe(false);
  });
});
