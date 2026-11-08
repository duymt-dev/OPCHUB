import { describe, expect, it } from 'vitest';
import { aiCallsQuerySchema, encodeAiCallsCursor } from './ai-calls';

describe('D-138 AI log contract', () => {
  it('defaults to 50 and seven VN calendar days; cursor preserves microseconds', () => {
    const q = aiCallsQuerySchema.parse({});
    expect(q.limit).toBe(50);
    expect(Date.parse(q.to) - Date.parse(q.from)).toBeLessThanOrEqual(7 * 86400000);
    const cursor = { at: '2026-11-08T04:00:00.123456Z', id: 'call-817' };
    expect(aiCallsQuerySchema.parse({ cursor: encodeAiCallsCursor(cursor) }).cursor).toEqual(
      cursor,
    );
  });
  it.each([
    { limit: 101 },
    { cursor: 'invalid' },
    { status: 'blocked' },
    { from: '2026-01-01T00:00:00Z', to: '2026-04-02T00:00:00Z' },
    { from: '2026-04-02T00:00:00Z', to: '2026-01-01T00:00:00Z' },
  ])('rejects invalid filter %j', (query) => {
    expect(aiCallsQuerySchema.safeParse(query).success).toBe(false);
  });
});
