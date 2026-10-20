import { describe, expect, it } from 'vitest';
import { policyPreview } from './policy-preview';

describe('REQ-308 REQ-312 server-owned policy preview', () => {
  it.each([
    [1, 6_000],
    [20, 120_000],
    [27, 162_000],
    [50, 300_000],
  ])('composes list price and existing commission formula at %i percent', (rate, commission) => {
    expect(policyPreview(rate)).toEqual({ rate, feeAmount: 600_000, commission });
  });
});
