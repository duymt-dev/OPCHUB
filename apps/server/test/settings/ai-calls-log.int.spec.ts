import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { FakeStorageProvider } from '@opchub/integrations';
import { aiCallsPageSchema, exportJobSchema } from '@opchub/shared/api-domains';
import { STORAGE } from '@/common/integrations';
import { ExportService } from '@/modules/export';
import { aiOpsFixture } from '../helpers/ai-ops-fixture';
import { createUser } from '../factories/user.factory';
import { tokenOf } from '../factories/group.factory';

describe('D-138 metadata call log and CSV', () => {
  const storage = new FakeStorageProvider();
  const f = aiOpsFixture('TIP817-log', { overrides: [[STORAGE, storage]] });
  let token: string, adminId: string;
  const base = new Date(Math.ceil((Date.now() + 86400000) / 1000) * 1000);
  const filters = {
    from: base.toISOString(),
    to: new Date(base.getTime() + 1000).toISOString(),
    purpose: 'content',
    status: 'error',
  };
  beforeAll(async () => {
    const admin = await createUser(f.t, { adminPermissions: ['settings.general'] });
    adminId = admin.id;
    token = await tokenOf(f.t, admin);
    f.cleanup(async () => {
      await f.t.prisma.db.exportJob.deleteMany({ where: { requestedBy: adminId } });
    });
  });
  it('filters 120 rows, stable tie keyset, accurate totals, safe CSV and audited export', async () => {
    const rows = Array.from({ length: 120 }, (_, i) => ({
      id: randomUUID(),
      createdAt: base,
      purpose: i % 2 ? 'bot' : 'content',
      provider: 'custom',
      model: f.model,
      promptTokens: 100,
      completionTokens: 10,
      cost: i,
      latencyMs: 5,
      status: i % 3 ? 'ok' : 'error',
      errorCode: i % 3 ? null : 'REJECTED',
    }));
    await f.t.prisma.db.llmCall.createMany({ data: rows });
    const firstId = rows[0]?.id;
    if (!firstId) throw Error('Missing log fixture');
    await f.t.prisma.db
      .$executeRaw`UPDATE llm_calls SET created_at=created_at + interval '1 microsecond' WHERE id=${firstId}`;
    const expected = rows.filter((r) => r.purpose === 'content' && r.status === 'error');
    const page = async (cursor?: string) => {
      const query = new URLSearchParams({ ...filters, limit: '7', ...(cursor ? { cursor } : {}) });
      const response = await f.t.call(`/admin/settings/ai/calls?${query.toString()}`, { token });
      expect(response.status).toBe(200);
      return aiCallsPageSchema.parse(await response.json());
    };
    const a = await page();
    expect(a.items[0]?.id).toBe(firstId);
    expect(a.items[0]?.at).toContain('.000001Z');
    const b = await page(a.nextCursor ?? undefined);
    const c = await page(b.nextCursor ?? undefined);
    expect(a.totals).toEqual({
      calls: 20,
      cost: expected.reduce((n, r) => n + r.cost, 0),
      promptTokens: 2000,
      completionTokens: 200,
    });
    expect(new Set([...a.items, ...b.items, ...c.items].map((r) => r.id))).toEqual(
      new Set(expected.map((r) => r.id)),
    );
    expect(c.nextCursor).toBeNull();
    expect([...a.items, ...b.items, ...c.items]).toHaveLength(20);
    const response = await f.t.call('/admin/settings/ai/calls/export', {
      method: 'POST',
      token,
      json: filters,
    });
    expect(response.status).toBe(202);
    const job = exportJobSchema.parse(await response.json());
    await f.t.app.get(ExportService).run(job.jobId);
    const csv = storage.objects.get(`exports/${job.jobId}.csv`)?.body.toString('utf8') ?? '';
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('Chi phí (đ)');
    expect(csv.split('\n')).toHaveLength(21);
    expect(csv).not.toContain('@');
    expect(
      await f.t.prisma.db.auditLog.count({
        where: { actorId: adminId, action: 'llm.calls.export', entityId: job.jobId },
      }),
    ).toBe(1);
  });
  it('denies missing permissions, invalid ranges/cursor and oversized export body', async () => {
    const denied = await tokenOf(f.t, await createUser(f.t, { adminPermissions: ['groups.view'] }));
    expect((await f.t.call('/admin/settings/ai/calls', { token: denied })).status).toBe(403);
    expect(
      (
        await f.t.call('/admin/settings/ai/calls/export', {
          method: 'POST',
          token: denied,
          json: {},
        })
      ).status,
    ).toBe(403);
    expect((await f.t.call('/admin/settings/ai/calls?cursor=bad', { token })).status).toBe(400);
    expect(
      (
        await f.t.call('/admin/settings/ai/calls/export', {
          method: 'POST',
          token,
          json: { from: '2026-01-01T00:00:00Z', to: '2026-05-01T00:00:00Z' },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await f.t.call('/admin/settings/ai/calls/export', {
          method: 'POST',
          token,
          json: { extra: 'x'.repeat(2 * 1024 * 1024) },
        })
      ).status,
    ).toBe(413);
  });
});
