import { describe, expect, it } from 'vitest';
import { policyYears } from './policy-year-table';
describe('REQ-619 policy year rows', () => {
  it.each([
    [50, 10, 20],
    [60, 15, 25],
    [20, 10, 20],
    [100, 30, 0],
    [30, 7, 20],
  ])('rows match prototype nf %s/%s/%s', (first, step, min) => {
    const rows = policyYears({ regionalFirstYear: first, regionalStep: step, regionalMin: min });
    const nf = Math.max(2, Math.ceil((first - min) / Math.max(1, step)) + 1);
    expect(rows).toHaveLength(nf);
    expect(rows.map((r) => r.percent)).toEqual(
      Array.from({ length: nf }, (_, i) => Math.max(min, first - step * i)),
    );
  });
  it('D-132 zero step single row', () => {
    expect(policyYears({ regionalFirstYear: 50, regionalStep: 0, regionalMin: 20 })).toEqual([
      { year: 1, last: true, percent: 50 },
    ]);
  });
});
