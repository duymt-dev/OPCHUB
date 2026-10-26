import { adminBadgesSchema, adminOverviewSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { RedisService } from '@/common/redis/redis.service';
import {
  lastMonths,
  ReportingCoreModule,
  StatsDailyService,
  vnYesterday,
} from '@/modules/reporting';
import { addMember, createGroup, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

/** Ngày giả (năm 2001) để không đụng số liệu thật của DB test */
const DAY = '2001-03-15';

describe('Admin Tổng quan + stats_daily + badge (B44)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp({ imports: [ReportingCoreModule] });
  });
  beforeEach(() => flushAuthState(t));
  afterAll(async () => {
    await t.prisma.db.statsDaily.deleteMany({ where: { day: { lt: new Date('2002-01-01') } } });
    await t.close();
  });

  it('lastMonths: 7 tháng VN cũ → mới, qua năm đúng; vnYesterday theo giờ VN', () => {
    const m = lastMonths(new Date('2026-02-10T20:00:00Z')); // 03:00 11/02 VN
    expect(m.map((x) => x.label)).toEqual(['T8', 'T9', 'T10', 'T11', 'T12', 'T1', 'T2']);
    expect(m[0]?.day).toBe('2025-08-31');
    expect(m[6]?.day).toBe('2026-02-11');
    expect(vnYesterday(new Date('2026-10-17T17:30:00Z'))).toBe('2026-10-17'); // 00:30 18/10 VN
  });

  it('statsDaily: ghi đủ chỉ số một lần, chạy lại ghi đè không nhân đôi', async () => {
    const s = t.app.get(StatsDailyService);
    await s.capture(DAY);
    await s.capture(DAY);
    const rows = await t.prisma.db.statsDaily.findMany({ where: { day: new Date(DAY) } });
    expect(rows.map((r) => r.metric).sort()).toEqual(
      [
        'events_upcoming',
        'groups',
        'members_active',
        'members_inactive',
        'members_new',
        'members_total',
        'projects_live',
        'projects_pending',
      ].sort(),
    );
  });

  it('weekly_active = số người gửi tin 7 ngày trong nhóm', async () => {
    const g = await createGroup(t);
    const [a, b] = await Promise.all([createUser(t), createUser(t)]);
    await addMember(t, g.id, a.id);
    await addMember(t, g.id, b.id);
    const room = await t.prisma.db.room.findFirstOrThrow({ where: { groupId: g.id } });
    await t.prisma.db.message.createMany({
      data: [
        { roomId: room.id, senderId: a.id, clientMsgId: `wa-${a.id}-1`, body: 'x' },
        { roomId: room.id, senderId: a.id, clientMsgId: `wa-${a.id}-2`, body: 'y' },
        { roomId: room.id, senderId: b.id, clientMsgId: `wa-${b.id}-1`, body: 'z' },
      ],
    });
    await t.app.get(StatsDailyService).weeklyActive(new Date(Date.now() + 1000));
    const row = await t.prisma.db.group.findUniqueOrThrow({
      where: { id: g.id },
      select: { weeklyActive: true },
    });
    expect(row.weeklyActive).toBe(2);
  });

  it('GET /admin/overview: đúng schema, KPI khớp đếm, cache 60s; thành viên 403', async () => {
    await t.app.get(RedisService).client.del('admin:overview');
    const admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    const r = await t.call('/admin/overview', { token: admin });
    expect(r.status).toBe(200);
    const o = adminOverviewSchema.parse(await r.json());
    expect(o.communities.value).toBe(await t.prisma.db.group.count({ where: { deletedAt: null } }));
    expect(o.growth).toHaveLength(7);
    expect(await t.app.get(RedisService).client.ttl('admin:overview')).toBeGreaterThan(0);
    const m = await tokenOf(t, await createUser(t));
    expect((await t.call('/admin/overview', { token: m })).status).toBe(403);
  });

  it('BUG-029 CR-15 delta % và thành viên mới tháng này thật; range = đầu tháng → hôm nay (VN)', async () => {
    await t.app.get(RedisService).client.del('admin:overview');
    await createUser(t);
    const admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    const o = adminOverviewSchema.parse(
      await (await t.call('/admin/overview', { token: admin })).json(),
    );
    const vn = new Date(Date.now() + 7 * 3_600_000);
    const start = new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), 1) - 7 * 3_600_000);
    const live = { deletedAt: null, systemRole: 'member' } as const;
    const [total, fresh] = await Promise.all([
      t.prisma.db.user.count({ where: live }),
      t.prisma.db.user.count({ where: { ...live, createdAt: { gte: start } } }),
    ]);
    expect(o.members.value).toBe(total);
    expect(o.newThisMonth).toBe(fresh);
    expect(o.newThisMonth).toBeGreaterThanOrEqual(1);
    expect(o.membersDeltaPct).toBe(Math.round((fresh / (total - fresh)) * 1000) / 10);
    const today = vn.toISOString().slice(0, 10);
    expect(o.range).toEqual({ from: `${today.slice(0, 8)}01`, to: today });
  });

  it('D-89 Luồng hệ thống: phí hiệu lực / tổng, gian hàng, nhu cầu, dự án, nhóm đếm trực tiếp', async () => {
    await t.app.get(RedisService).client.del('admin:overview');
    const admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    const o = adminOverviewSchema.parse(
      await (await t.call('/admin/overview', { token: admin })).json(),
    );
    const db = t.prisma.db;
    const paid = { status: { in: ['active', 'expiring'] as ('active' | 'expiring')[] } };
    const [fees, sp, sh, sd, no, nc, pp, pub, groups, events, upcoming] = await Promise.all([
      db.membershipFee.count({ where: paid }),
      db.store.count({ where: { status: 'published' } }),
      db.store.count({ where: { status: 'hidden' } }),
      db.store.count({ where: { status: 'draft' } }),
      db.need.count({ where: { status: 'open' } }),
      db.need.count({ where: { status: 'closed' } }),
      db.project.count({ where: { status: 'pending_review', deletedAt: null } }),
      db.project.count({ where: { status: 'published', deletedAt: null } }),
      db.group.count({ where: { deletedAt: null } }),
      db.event.count(),
      db.event.count({ where: { startsAt: { gte: new Date() } } }),
    ]);
    expect(o.flow).toEqual({
      paidMembers: fees,
      members: o.members.value,
      stores: { published: sp, hidden: sh, draft: sd },
      needs: { open: no, closed: nc },
      projects: { pending: pp, published: pub },
      groups,
    });
    expect(o.paid.value).toBe(fees);
    expect(o.paid.newThisMonth).toBeLessThanOrEqual(fees);
    expect(o.events).toMatchObject({ value: events, upcoming });
  });

  it('GET /admin/badges theo quyền: điều phối viên không có p.pub/n.edit → 0; admin đủ', async () => {
    const mod = await tokenOf(t, await createUser(t, { systemRole: 'moderator' }));
    const bm = adminBadgesSchema.parse(
      await (await t.call('/admin/badges', { token: mod })).json(),
    );
    expect(bm.requests).toBe(0);
    const pending = await t.prisma.db.project.count({
      where: { status: 'pending_review', deletedAt: null },
    });
    const admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    const ba = adminBadgesSchema.parse(
      await (await t.call('/admin/badges', { token: admin })).json(),
    );
    expect(ba.projects).toBe(pending);
    expect(ba.reports).toBe(await t.prisma.db.report.count({ where: { status: 'open' } }));
    const m = await tokenOf(t, await createUser(t));
    expect((await t.call('/admin/badges', { token: m })).status).toBe(403);
  });
});
