import { describe, expect, it } from 'vitest';
import { auditLogPageQuerySchema, encodeAuditLogCursor } from './audit-log-page';
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
