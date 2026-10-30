import { describe, expect, it } from 'vitest';
import { canAppointDirector, canRevokeDirector } from './regional-director.state';

describe('REQ-616 D-120 regional director state', () => {
  it('AT-GDV05 only an empty slot and unassigned member can be appointed', () => {
    expect(canAppointDirector(null, 'm1', [])).toBe(true);
    expect(canAppointDirector('m2', 'm1', [])).toBe(false);
    expect(canAppointDirector(null, 'm1', [{ region: 'north', userId: 'm1' }])).toBe(false);
    expect(canAppointDirector(null, 'm2', [{ region: 'north', userId: 'm1' }])).toBe(true);
  });
  it('REQ-616 only an occupied slot can be revoked', () => {
    expect(canRevokeDirector(null)).toBe(false);
    expect(canRevokeDirector('m1')).toBe(true);
  });
});
