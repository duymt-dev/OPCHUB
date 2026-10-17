import { DEFAULT_ROLE_PERMISSIONS } from '@opchub/shared';
import { adminBadgesSchema, adminOverviewSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthStateService } from '@/common/auth';
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
    await t.app.get(AuthStateService).setGrants(DEFAULT_ROLE_PERMISSIONS);
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
