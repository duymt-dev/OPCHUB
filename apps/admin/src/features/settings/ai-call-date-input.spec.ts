import { describe, expect, it } from 'vitest';
import { aiCallsQuerySchema } from '@opchub/shared/api-domains';
import { serializeAiCallDay } from './ai-call-date-input';

describe('D-141 AC824-08 owner-approved AI call-log UTC presentation serializer', () => {
  it.each([
    ['2026-11-12', '2026-11-11T17:00:00.000Z', '2026-11-12T16:59:59.999Z'],
    ['2026-01-01', '2025-12-31T17:00:00.000Z', '2026-01-01T16:59:59.999Z'],
    ['2026-03-01', '2026-02-28T17:00:00.000Z', '2026-03-01T16:59:59.999Z'],
    ['2028-02-29', '2028-02-28T17:00:00.000Z', '2028-02-29T16:59:59.999Z'],
  ])('preserves exact VN boundaries for %s', (day, from, to) => {
    expect(serializeAiCallDay(day, 'from')).toBe(from);
    expect(serializeAiCallDay(day, 'to')).toBe(to);
    expect(Date.parse(from)).toBe(Date.parse(`${day}T00:00:00+07:00`));
    expect(Date.parse(to)).toBe(Date.parse(`${day}T23:59:59.999+07:00`));
    expect(Date.parse(to) - Date.parse(from)).toBe(86400000 - 1);
    expect(aiCallsQuerySchema.safeParse({ from, to }).success).toBe(true);
  });

  it('does not relax the existing UTC query contract', () => {
    expect(
      aiCallsQuerySchema.safeParse({
        from: '2026-11-12T00:00:00+07:00',
        to: '2026-11-12T23:59:59.999+07:00',
      }).success,
    ).toBe(false);
  });
});
