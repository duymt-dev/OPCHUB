import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auditLog, recordAudit } from './audit-store';
import { auditLog as publicAuditLog, recordAudit as publicRecordAudit } from './group-admin';
import { listSettingsLog, logSetting } from './settings-log';
import { resetMockDb } from './store';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T05:00:00Z'));
  resetMockDb();
});
afterEach(() => vi.useRealTimers());
describe('P5-MSW-02 shared audit facade', () => {
  it('preserves public facade identity and timestamps new actions at their actual clock', () => {
    expect(publicAuditLog).toBe(auditLog);
    expect(publicRecordAudit).toBe(recordAudit);
    recordAudit('admin', 'moderation.hide', 'case');
    expect(auditLog()[0]).toMatchObject({
      actorId: 'admin',
      action: 'moderation.hide',
      target: 'case',
      at: '2026-10-21T05:00:00.000Z',
    });
  });
  it('visible activity logs and machine audits contain one corresponding write each', () => {
    logSetting('admin', 'moderation.dismiss', 'case', 'Bỏ qua', 'moderation');
    expect(auditLog()).toHaveLength(1);
    expect(listSettingsLog()[0]).toMatchObject({
      summary: 'Bỏ qua',
      tag: 'moderation',
      at: '2026-10-21T05:00:00.000Z',
    });
  });
  it('reset isolates audit state and leaves previously returned arrays untouched', () => {
    recordAudit('admin', 'moderation.hide', 'old-case');
    const old = auditLog();
    resetMockDb();
    expect(auditLog()).toEqual([]);
    expect(old).toHaveLength(1);
  });
});
