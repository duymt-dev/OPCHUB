import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { auditConfig } from './admin-performance/config';
import { compareJs, compareReceipts } from './admin-performance/compare';

test('D-141 AC824-16 all12 actual original-baseline route comparisons satisfy15% with explicit debt', ({
  browserName,
}, info) => {
  expect(browserName).toBe('chromium');
  const config = auditConfig(info.project.metadata);
  const result = compareReceipts(config.output);
  expect(result.pairs).toHaveLength(12);
  expect(result.pairs.every((p) => p.baseline.source.startsWith('f7c1b2b8'))).toBe(true);
  writeFileSync(resolve(config.output, 'performance.json'), JSON.stringify(result, null, 2) + '\n');
});

test('D-141 AC824-16 rejects absent/nonpositive or over15% executable measurements', () => {
  for (const [before, after] of [
    [0, 10],
    [10, 0],
    [-1, 10],
    [10, Number.NaN],
    [100, 116],
  ])
    expect(() => compareJs(before ?? 0, after ?? 0)).toThrow();
  expect(compareJs(100, 115).increasePercent).toBeCloseTo(15);
  const debt = compareJs(400_000, 410_000);
  expect(debt.baselineOver250KiB).toBe(true);
  expect(debt.currentOver250KiB).toBe(true);
  expect(debt.increasePercent).toBeCloseTo(2.5);
});
