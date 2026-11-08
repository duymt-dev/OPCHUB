import { describe, expect, it } from 'vitest';
import {
  auditLogFiltersSchema,
  auditLogPageQuerySchema,
  encodeAuditLogCursor,
} from './audit-log-page';
import { exportParamsSchema } from './export';

describe('REQ-624 strict audit pagination contract', () => {
  it('default50, bounded100 and base64url UTF8 cursor round trip', () => {
    const cursor = { at: '2026-11-05T10:00:00.000Z', id: 'id-123' };
    expect(
      auditLogPageQuerySchema.parse({ cursor: encodeAuditLogCursor(cursor), limit: '100' }),
    ).toEqual({ cursor, limit: 100 });
    expect(auditLogPageQuerySchema.parse({})).toEqual({ limit: 50 });
  });
  it('rejects malformed cursor/schema/unknown keys and invalid limits', () => {
    for (const value of [
      { cursor: '%' },
      { cursor: 'YQ' },
      { limit: 0 },
      { limit: 101 },
      { sort: 'id' },
    ])
      expect(auditLogPageQuerySchema.safeParse(value).success).toBe(false);
    expect(exportParamsSchema.parse({ kind: 'audit' })).toEqual({ kind: 'audit' });
    expect(exportParamsSchema.safeParse({ kind: 'audit', days: 100 }).success).toBe(false);
  });
});

describe('D-139 audit filters', () => {
  it('keeps old query and queued audit jobs backward compatible', () => {
    expect(auditLogPageQuerySchema.parse({})).toEqual({ limit: 50 });
    expect(exportParamsSchema.parse({ kind: 'audit' })).toEqual({ kind: 'audit' });
  });
  it('accepts actor/system, tags and ISO ranges outside the window for SQL clamping', () => {
    const filters = {
      tag: 'member',
      actorId: 'system',
      from: '2020-01-01T00:00:00Z',
      to: '2100-01-01T00:00:00Z',
    };
    expect(auditLogFiltersSchema.parse(filters)).toEqual(filters);
    expect(exportParamsSchema.parse({ kind: 'audit', filters })).toEqual({
      kind: 'audit',
      filters,
    });
  });
  it.each([
    { tag: 'unknown' },
    { actorId: '' },
    { actorId: 'a'.repeat(201) },
    { from: '2026-11-08' },
    { to: 'invalid' },
    { summary: 'text' },
    { from: '2026-11-08T00:00:00Z', to: '2026-11-07T00:00:00Z' },
  ])('rejects invalid or unknown filter %j in both query and export', (filters) => {
    expect(auditLogPageQuerySchema.safeParse(filters).success).toBe(false);
    expect(exportParamsSchema.safeParse({ kind: 'audit', filters }).success).toBe(false);
  });
});
