import { pageSchema } from '@opchub/shared/api';
import { projectCardSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { OutboxRelayService } from '@/common/outbox';
import { ProjectRepository } from '@/modules/project';
import { AccountCoreModule } from '@/modules/account';
import { AccountProcessor } from '@/worker/processors/account.processor';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createProject, removeTestProjects } from '../factories/project.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { drainOutbox, expireLeases, setStatus } from './lock-helpers';

const explorePage = pageSchema(projectCardSchema);

/** TIP-V2-104: khoá TK lan truyền — dự án Public ẩn, nhóm làm chủ về Super Admin (NA-16, D-55) */
describe('Khoá tài khoản lan truyền (TIP-V2-104)', () => {
  let t: TestApp;
  let admin: string;
  let superAdminId: string;

  /** Super Admin active tạo sớm nhất — cùng luật với GroupAdminRepository.oldestSuperAdmin */
  const oldestSuperAdmin = async () =>
    (
      await t.prisma.db.adminUser.findFirstOrThrow({
        where: { role: { key: 'super_admin' }, status: 'active', deletedAt: null },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true },
      })
    ).id;

  beforeAll(async () => {
    t = await createTestApp({ imports: [AccountCoreModule], providers: [AccountProcessor] });
    await flushAuthState(t);
    await createUser(t, { systemRole: 'super_admin' });
    superAdminId = await oldestSuperAdmin();
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    // Sự kiện tồn từ lần chạy trước không làm nhiễu các test dưới
    await drainOutbox(t);
  });
  beforeEach(() => flushAuthState(t));
  afterAll(async () => {
    await removeTestProjects(t);
    await removeTestGroups(t);
    await t.close();
  });

  /** A: thành viên có dự án Public `p6` + làm chủ nhóm `c5`; viewer: thành viên khác */
  async function scenario() {
    const a = await createUser(t, { fee: 'active' });
    const p6 = await createProject(t, await tokenOf(t, a), { visibility: 'public' });
    const c5 = await createGroup(t);
    await addMember(t, c5.id, a.id, 'owner');
    const viewer = await tokenOf(t, await createUser(t, { fee: 'active' }));
    return { a, p6, c5, viewer };
  }

  const exploreIds = async (token: string, q: string) => {
    const r = await t.call(`/projects?q=${encodeURIComponent(q)}&size=50`, { token });
    return explorePage.parse(await r.json()).items.map((p) => p.id);
  };
  const roleOf = (groupId: string, userId: string) =>
    t.prisma.db.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { groupRole: true, status: true },
    });

  it('REQ-216 BUG-004 khoá → dự án Public ẩn khỏi Khám phá và chi tiết', async () => {
    const { a, p6, viewer } = await scenario();
    expect(await exploreIds(viewer, p6.name)).toEqual([p6.id]);
    expect((await t.call(`/projects/${p6.id}`, { token: viewer })).status).toBe(200);

    await setStatus(t, admin, a.id, 'locked');
    // Hiệu lực ngay lúc commit khoá (không chờ relay) — không đổi projects.status
    expect(await exploreIds(viewer, p6.name)).toEqual([]);
    expect((await t.call(`/projects/${p6.id}`, { token: viewer })).status).toBe(404);
    const row = await t.prisma.db.project.findUniqueOrThrow({ where: { id: p6.id } });
    expect(row.status).toBe('published');
  });

  it('REQ-216 khoá → chủ dự án vẫn thấy dự án của mình (Dự án của tôi)', async () => {
    const { a, p6 } = await scenario();
    await setStatus(t, admin, a.id, 'locked');
    const repo = t.app.get(ProjectRepository);
    expect(await repo.findVisible(a.id, p6.id, new Date())).not.toBeNull();
    expect((await repo.mine(a.id)).map((p) => p.id)).toContain(p6.id);
  });

  it('D-55 BUG-004 khoá → nhóm làm chủ chuyển về super_admin, giữ làm thành viên', async () => {
    const { a, c5 } = await scenario();
    const before = await t.prisma.db.group.findUniqueOrThrow({ where: { id: c5.id } });
    await setStatus(t, admin, a.id, 'locked');
    await drainOutbox(t);

    expect(await roleOf(c5.id, superAdminId)).toEqual({ groupRole: 'owner', status: 'member' });
    expect(await roleOf(c5.id, a.id)).toEqual({ groupRole: 'member', status: 'member' });
    const owners = await t.prisma.db.groupMember.count({
      where: { groupId: c5.id, groupRole: 'owner' },
    });
    expect(owners).toBe(1);
    const after = await t.prisma.db.group.findUniqueOrThrow({ where: { id: c5.id } });
    expect(after.memberCount).toBe(before.memberCount + 1);
    const audit = await t.prisma.db.auditLog.findMany({
      where: { action: 'group.owner_transfer', entityId: c5.id },
      select: { actorId: true, summary: true },
    });
    expect(audit).toEqual([
      { actorId: null, summary: `Chuyển chủ nhóm ${c5.name} về Admin (TK bị khoá)` },
    ]);
  });

  it('D-55 mở khoá → dự án hiện lại, nhóm không trả lại', async () => {
    const { a, p6, c5, viewer } = await scenario();
    await setStatus(t, admin, a.id, 'locked');
    await drainOutbox(t);
    await setStatus(t, admin, a.id, 'active');
    const unlocked = await t.prisma.db.outboxEvent.count({
      where: { type: 'user.unlocked', payload: { equals: { userId: a.id } } },
    });
    expect(unlocked).toBe(1);
    await drainOutbox(t);

    expect(await exploreIds(viewer, p6.name)).toEqual([p6.id]);
    expect((await t.call(`/projects/${p6.id}`, { token: viewer })).status).toBe(200);
    expect(await roleOf(c5.id, superAdminId)).toMatchObject({ groupRole: 'owner' });
    expect(await roleOf(c5.id, a.id)).toMatchObject({ groupRole: 'member' });
    const pending = await t.prisma.db.outboxEvent.count({
      where: { type: 'user.unlocked', dispatchedAt: null },
    });
    expect(pending).toBe(0);
  });

  it('REQ-216 handler idempotent', async () => {
    const { a, c5 } = await scenario();
    await setStatus(t, admin, a.id, 'locked');
    await drainOutbox(t);
    const snapshot = async () => ({
      members: await t.prisma.db.groupMember.findMany({
        where: { groupId: c5.id },
        select: { userId: true, groupRole: true, status: true },
        orderBy: { userId: 'asc' },
      }),
      count: (await t.prisma.db.group.findUniqueOrThrow({ where: { id: c5.id } })).memberCount,
      audit: await t.prisma.db.auditLog.count({
        where: { action: 'group.owner_transfer', entityId: c5.id },
      }),
    });
    const first = await snapshot();
    // Relay gọi lại `user.locked` lần 2 (vd process chết trước khi đánh dấu)
    await t.prisma.db.$executeRaw`
      UPDATE outbox_events SET dispatched_at = NULL, locked_until = NULL
      WHERE type = 'user.locked' AND payload->>'userId' = ${a.id}`;
    expect(await t.app.get(OutboxRelayService).relayOnce()).toBeGreaterThanOrEqual(1);
    expect(await snapshot()).toEqual(first);
  });

  it('REQ-216 test âm: không có super_admin → lỗi, relay thử lại', async () => {
    const { a, c5 } = await scenario();
    const supers = await t.prisma.db.adminUser.findMany({
      where: { role: { key: 'super_admin' }, status: 'active' },
      select: { id: true },
    });
    const ids = supers.map((s) => s.id);
    try {
      await setStatus(t, admin, a.id, 'locked');
      await t.prisma.db.adminUser.updateMany({
        where: { id: { in: ids } },
        data: { status: 'locked' },
      });
      await drainOutbox(t);
      const ev = await t.prisma.db.outboxEvent.findFirstOrThrow({
        where: { type: 'user.locked', payload: { equals: { userId: a.id, reason: null } } },
      });
      expect(ev).toMatchObject({ dispatchedAt: null, attempts: 1 });
      expect(ev.lastError).toContain('Super Admin');
      expect(await roleOf(c5.id, a.id)).toMatchObject({ groupRole: 'owner' });
    } finally {
      await t.prisma.db.adminUser.updateMany({
        where: { id: { in: ids } },
        data: { status: 'active' },
      });
    }
    // Có lại Super Admin → lần thử sau thành công
    await expireLeases(t);
    await drainOutbox(t);
    expect(await roleOf(c5.id, a.id)).toMatchObject({ groupRole: 'member' });
    expect(await roleOf(c5.id, superAdminId)).toMatchObject({ groupRole: 'owner' });
  });
});
