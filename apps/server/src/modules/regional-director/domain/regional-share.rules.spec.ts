import { describe, expect, it } from 'vitest';
import { canPayRegionalShare, regionalShareSnapshot } from './regional-share.rules';
describe('regional share transitions and snapshots', () => {
  it('only pending can transition to paid', () => {
    expect(canPayRegionalShare('pending')).toBe(true);
    expect(canPayRegionalShare('paid')).toBe(false);
  });
  it('vacant region leaves all money at Media Soft', () => {
    const at = new Date('2026-11-01');
    expect(
      regionalShareSnapshot(
        {
          source: 'membership',
          sourceId: 'x',
          customerId: 'u',
          baseAmount: 1234567,
          plan: 'personal',
          at,
        },
        at,
        { regionalFirstYear: 50, regionalStep: 10, regionalMin: 20 },
        false,
      ),
    ).toMatchObject({
      percent: 0,
      directorAmount: 0,
      mediaSoftAmount: 1234567,
      monthKey: '2026-11',
    });
  });
});
