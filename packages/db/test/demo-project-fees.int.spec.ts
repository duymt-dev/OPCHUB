import { expect, it } from 'vitest';
import { isFeeUsable } from '@opchub/shared';
import { projectDemoFees } from '../seed/demo/project-fees';

it('project-demo guests are real trial rows; the unpaid demo member is never activated', () => {
  const now = new Date('2030-01-01T00:00:00Z');
  const rows = projectDemoFees(now).guests;
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.every((r) => r.userId.startsWith('g-'))).toBe(true);
  expect(rows.map((r) => r.userId)).not.toContain('m6');
  expect(
    rows.every((r) => isFeeUsable({ ...r, validUntil: r.validUntil.toISOString() }, now)),
  ).toBe(true);
});

it('the expiring fixture remains usable relative to execution time instead of expiring forever', () => {
  const now = new Date('2030-01-01T00:00:00Z');
  const end = projectDemoFees(now).expiringUntil;
  expect(end.getTime()).toBeGreaterThan(now.getTime());
  expect(end.getTime() - now.getTime()).toBeLessThanOrEqual(7 * 864e5);
});
