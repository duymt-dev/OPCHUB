import { describe, expect, it } from 'vitest';
import { adminOverviewQuerySchema } from './overview';

describe('REQ-122 overview query contract', () => {
  it.each([
    { from: '2026-02-29', to: '2026-03-01' },
    { from: '2026-13-01', to: '2026-13-02' },
    { from: '2026-10-02', to: '2026-10-01' },
    { from: '2026-10-01' },
    { to: '2026-10-01' },
    { from: '1/10/2026', to: '2026-10-02' },
    { period: 'quarter' },
  ])('REQ-122 rejects invalid overview query %j', (query) => {
    const parsed = adminOverviewQuerySchema.safeParse(query);
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0]?.path.length).toBeGreaterThan(0);
  });
  it('REQ-122 accepts defaults, leap day and equal dates', () => {
    expect(adminOverviewQuerySchema.parse({})).toEqual({ period: 'month' });
    expect(adminOverviewQuerySchema.parse({ from: '2024-02-29', to: '2024-02-29' })).toEqual({
      from: '2024-02-29',
      to: '2024-02-29',
      period: 'month',
    });
  });
});
