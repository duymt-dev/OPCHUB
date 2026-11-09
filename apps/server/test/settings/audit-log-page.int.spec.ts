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
import { createUser, flushAuthState, type UserSpec } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

let NOW = new Date('2100-10-16T03:45:00Z');
const DAY = 86_400_000;
describe('REQ-624 BR-485 audit pages and real export job', () => {
  let t: TestApp, token: string, actor: string;
  const adminIds: string[] = [];
  async function createAdminFixture(spec: UserSpec) {
    const admin = await createUser(t, spec);
    adminIds.push(admin.id);
    return admin;
  }
  const storage = new FakeStorageProvider(),
    prefix = randomUUID();
  beforeAll(async () => {
    t = await createTestApp({ overrides: [[STORAGE, storage]] });
    await flushAuthState(t);
    const admin = await createAdminFixture({ systemRole: 'super_admin' });
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
    if (!t) return;
    try {
      // Retain append-only audit history, but never leak this suite's accounts/custom roles.
      await t.prisma.db.$transaction(async (tx) => {
        const roles = await tx.adminUser.findMany({
          where: { id: { in: adminIds } },
          select: { roleId: true },
        });
        await tx.adminUser.deleteMany({ where: { id: { in: adminIds } } });
        await tx.user.deleteMany({ where: { id: { in: adminIds } } });
        await tx.adminRole.deleteMany({
          where: {
            id: { in: roles.flatMap((r) => (r.roleId ? [r.roleId] : [])) },
            isSystem: false,
            users: { none: {} },
          },
        });
      });
    } finally {
      await t.close();
    }
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
    const denied = await tokenOf(
      t,
      await createAdminFixture({ adminPermissions: ['events.view'] }),
    );
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

  it('filters by tag actor and range inside the 90-day window', async () => {
    const now = new Date(),
      a = `${prefix}-A`,
      b = `${prefix}-B`,
      c = `${prefix}-C`;
    const data = [a, b, c].flatMap((actorId) =>
      ['member', 'settings', 'project', 'permission'].flatMap((tag) =>
        [1, 2, 10, 29, 45, 100].map((days) => ({
          id: randomUUID(),
          actorId,
          tag,
          action: 'test.filters',
          entity: 'test',
          entityId: prefix,
          summary: `${actorId}-${tag}-${days}`,
          createdAt: new Date(now.getTime() - days * DAY),
        })),
      ),
    );
    await t.prisma.db.auditLog.createMany({ data });
    const filters = {
      tag: 'member' as const,
      actorId: a,
      from: new Date(now.getTime() - 30 * DAY).toISOString(),
    };
    const ids: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await t.app
        .get(AuditLogService)
        .page(auditLogPageQuerySchema.parse({ ...filters, cursor, limit: 2 }), now);
      ids.push(...page.items.map((r) => r.id));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(ids).toEqual(
      data
        .filter(
          (r) =>
            r.actorId === a &&
            r.tag === 'member' &&
            r.createdAt.getTime() >= Date.parse(filters.from),
        )
        .map((r) => r.id),
    );
    expect(new Set(ids).size).toBe(4);
    const clamped = await t.app.get(AuditLogService).page(
      auditLogPageQuerySchema.parse({
        actorId: a,
        from: new Date(now.getTime() - 200 * DAY).toISOString(),
        to: '2200-01-01T00:00:00Z',
      }),
      now,
    );
    expect(clamped.items).toHaveLength(20);
    const system = await t.prisma.db.auditLog.create({
      data: {
        actorId: null,
        action: 'test.system',
        entity: 'test',
        entityId: prefix,
        summary: 'System filter',
        tag: 'member',
        createdAt: now,
      },
    });
    const systemPage = await t.app.get(AuditLogService).page(
      auditLogPageQuerySchema.parse({
        actorId: 'system',
        tag: 'member',
        from: now.toISOString(),
        to: now.toISOString(),
      }),
      now,
    );
    expect(systemPage.items.map((r) => r.id)).toEqual([system.id]);
    for (const query of [
      'tag=wrong',
      'actorId=',
      'from=wrong',
      'from=2026-11-08T00:00:00Z&to=2026-11-07T00:00:00Z',
      'summary=free',
    ]) {
      expect((await t.call(`/admin/audit-logs?${query}`, { token })).status).toBe(400);
    }
  });

  it('export applies filters and old payload still works', async () => {
    const marker = `${prefix}-export`,
      now = new Date();
    await t.prisma.db.auditLog.createMany({
      data: ['member', 'settings'].map((tag) => ({
        actorId: marker,
        action: 'test.export_filter',
        entity: 'test',
        entityId: prefix,
        summary: `Filtered-${tag}`,
        tag,
        createdAt: now,
      })),
    });
    const filters = { actorId: marker, tag: 'member' };
    const response = await t.call('/admin/audit-logs/export', {
      method: 'POST',
      token,
      json: { filters },
    });
    expect(response.status).toBe(202);
    const { jobId } = exportJobSchema.parse(await response.json());
    const job = await t.prisma.db.exportJob.findUniqueOrThrow({ where: { id: jobId } });
    expect(job.params).toEqual({ kind: 'audit', filters });
    const audit = await t.prisma.db.auditLog.findFirstOrThrow({
      where: { action: 'export.audit', entityId: jobId },
    });
    expect(audit.diff).toEqual({ filters });
    await t.app.get(ExportService).run(jobId);
    const csv = storage.objects.get(`exports/${jobId}.csv`)?.body.toString('utf8');
    expect(csv).toContain('Filtered-member');
    expect(csv).not.toContain('Filtered-settings');
    const built = await t.app.get(AuditLogExportService).build(new Date());
    expect(built.csv).toContain('Filtered-member');
    expect(built.csv).toContain('Filtered-settings');
    expect(
      (
        await t.call('/admin/audit-logs/export', {
          method: 'POST',
          token,
          json: { filters: { tag: 'bad' } },
        })
      ).status,
    ).toBe(400);
  });

  it('log-only permission can load the existing admin directory without admin management grants', async () => {
    const auth = await tokenOf(t, await createAdminFixture({ adminPermissions: ['settings.log'] }));
    const response = await t.call('/admin/audit-logs/actors', { token: auth });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { items: { id: string; name: string }[] };
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.every((a) => Object.keys(a).sort().join(',') === 'id,name')).toBe(true);
    const denied = await tokenOf(
      t,
      await createAdminFixture({ adminPermissions: ['events.view'] }),
    );
    expect((await t.call('/admin/audit-logs/actors', { token: denied })).status).toBe(403);
  });
});
