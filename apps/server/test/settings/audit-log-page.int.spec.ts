import { FakeStorageProvider } from '@opchub/integrations';
import { apiErrorSchema } from '@opchub/shared/api';
import {
  auditLogPageQuerySchema,
  auditLogPageSchema,
  exportJobSchema,
  exportStatusSchema,
} from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { STORAGE } from '@/common/integrations';
import { ExportService } from '@/modules/export';
import { AuditLogService } from '@/modules/settings/services/audit-log.service';
import { AuditLogExportService } from '@/modules/settings/services/audit-log-export.service';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

let NOW = new Date('2100-10-16T03:45:00Z');
const DAY = 86_400_000;
describe('REQ-624 BR-485 audit pages and real export job', () => {
  let t: TestApp, token: string, actor: string;
  const storage = new FakeStorageProvider(),
    prefix = randomUUID();
  beforeAll(async () => {
    t = await createTestApp({ overrides: [[STORAGE, storage]] });
    await flushAuthState(t);
    const admin = await createUser(t, { systemRole: 'super_admin' });
    actor = admin.id;
    token = await tokenOf(t, admin);
    const last = await t.prisma.db.auditLog.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (last && last.createdAt >= NOW) NOW = new Date(last.createdAt.getTime() + 120 * DAY);
    NOW.setUTCHours(3, 45, 0, 0); // Each rerun advances beyond old append-only fixtures, never deletes history.
    await t.prisma.db.auditLog.createMany({
      data: Array.from({ length: 125 }, (_, i) => ({
        id: `${prefix}-${String(i).padStart(3, '0')}`,
        actorId: actor,
        action: 'test.audit_page',
        entity: 'test',
        entityId: prefix,
        summary: i === 0 ? '=SUM(1,2)' : `row ${i}`,
        tag: 'settings',
        createdAt: new Date(NOW.getTime() - (i < 120 ? 0 : 100 * DAY)),
      })),
    });
  });
  afterAll(async () => {
    await t.close();
  });

  it('120 tied rows paginate50/50/20 without duplicates; excludes older100-day rows', async () => {
    const ids: string[] = [],
      sizes: number[] = [];
    let cursor: string | undefined;
    for (;;) {
      const page = auditLogPageSchema.parse(
        await t.app.get(AuditLogService).page(auditLogPageQuerySchema.parse({ cursor }), NOW),
      );
      sizes.push(page.items.length);
      ids.push(...page.items.map((r) => r.id));
      expect(page.items.every((r) => r.actorName.length > 0)).toBe(true);
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }
    expect(sizes).toEqual([50, 50, 20]);
    expect(new Set(ids).size).toBe(120);
    expect(ids).toEqual([...ids].sort().reverse());
  });

  it('cursor and limit are validated by HTTP; page response uses shared contract', async () => {
    for (const query of ['cursor=not-json', 'cursor=%25%25%25', 'limit=0', 'limit=101']) {
      const res = await t.call(`/admin/audit-logs?${query}`, { token });
      expect(res.status).toBe(400);
      const error = apiErrorSchema.parse(await res.json()).error;
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.fields?.length).toBeGreaterThan(0);
    }
    const page = auditLogPageSchema.parse(
      await (await t.call('/admin/audit-logs', { token })).json(),
    );
    expect(page.items.length).toBeLessThanOrEqual(50);
  });

  it('export builder takes90 days at run time, BOM, exact headers, VN date, safe formulas and translated tag', async () => {
    const built = await t.app.get(AuditLogExportService).build(NOW);
    expect(built.rows).toBe(120);
    expect(built.csv.charCodeAt(0)).toBe(0xfeff);
    expect(built.csv.slice(1).split('\n')[0]).toBe('Người thực hiện,Thao tác,Nhóm,Thời gian');
    expect(built.csv).toContain('"\'=SUM(1,2)"');
    expect(built.csv).toContain(
      `"Cấu hình","${NOW.toLocaleDateString('en-GB', { timeZone: 'UTC' })} 10:45"`,
    );
    expect(built.csv).not.toContain('row 124');
  });

  it('202 request audits atomically; real builder produces done audit kind and correct download filename', async () => {
    const request = await t.call('/admin/audit-logs/export', { method: 'POST', token });
    expect(request.status).toBe(202);
    const job = exportJobSchema.parse(await request.json());
    expect(
      await t.prisma.db.auditLog.count({
        where: { actorId: actor, action: 'export.audit', entityId: job.jobId },
      }),
    ).toBe(1);
    expect(
      await t.prisma.db.outboxEvent.count({
        where: { type: 'export.requested', payload: { path: ['exportJobId'], equals: job.jobId } },
      }),
    ).toBe(1);
    await t.app.get(ExportService).run(job.jobId);
    const signed = vi.spyOn(storage, 'presignGet');
    const status = exportStatusSchema.parse(
      await (await t.call(`/admin/exports/${job.jobId}`, { token })).json(),
    );
    expect(status).toMatchObject({ kind: 'audit', status: 'done' });
    expect(status.url).not.toBeNull();
    expect(signed).toHaveBeenCalledWith(
      `exports/${job.jobId}.csv`,
      expect.any(Number),
      'nhat-ky-hoat-dong.csv',
    );
    signed.mockRestore();
    expect(
      storage.objects.get(`exports/${job.jobId}.csv`)?.body.toString('utf8').charCodeAt(0),
    ).toBe(0xfeff);
  });

  it('lecturer without settings.log cannot view or export', async () => {
    const denied = await tokenOf(t, await createUser(t, { adminPermissions: ['events.view'] }));
    expect((await t.call('/admin/audit-logs', { token: denied })).status).toBe(403);
    expect(
      (await t.call('/admin/audit-logs/export', { method: 'POST', token: denied })).status,
    ).toBe(403);
  });

  it('preserves PostgreSQL microseconds across one-row cursor pages, no lost entries', async () => {
    await t.prisma.db
      .$executeRaw`INSERT INTO audit_logs(id,action,entity,entity_id,summary,created_at)
      SELECT ${prefix}||'-micro-'||n,'test.micro','test',${prefix},'micro',
        ${NOW.toISOString()}::timestamptz + interval '1 day' + n * interval '1 microsecond'
      FROM generate_series(1,3)n`;
    const now = new Date(NOW.getTime() + DAY + 1000),
      found: string[] = [];
    let cursor: string | undefined;
    for (let i = 0; i < 3; i++) {
      const page = await t.app
        .get(AuditLogService)
        .page(auditLogPageQuerySchema.parse({ limit: 1, cursor }), now);
      found.push(...page.items.map((r) => r.id));
      cursor = page.nextCursor ?? undefined;
    }
    expect(found).toEqual([3, 2, 1].map((n) => `${prefix}-micro-${n}`));
  });
});
