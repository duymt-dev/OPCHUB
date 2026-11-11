import { describe, expect, it } from 'vitest';
import { seriesLabel } from './series-labels';

describe('D-141 AC824-08 chart label presentation keeps D-140 series semantics', () => {
  const labels = { month: (n: number) => `Month ${n}`, week: (n: number) => `Week ${n}` };
  it('localizes only canonical month/week labels and leaves year/unknown values intact', () => {
    expect(seriesLabel('T10', 'month', labels)).toBe('Month 10');
    expect(seriesLabel('W53', 'week', labels)).toBe('Week 53');
    expect(seriesLabel('2026', 'year', labels)).toBe('2026');
    for (const raw of ['T0', 'T13', 'W0', 'W54', 'custom', 'T01']) {
      expect(seriesLabel(raw, 'month', labels)).toBe(raw);
      expect(seriesLabel(raw, 'week', labels)).toBe(raw);
    }
    expect(seriesLabel('T10', 'week', labels)).toBe('T10');
  });
});
