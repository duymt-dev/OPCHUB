import { verify } from 'argon2';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../src/client';
import { assertDemoDatabase } from '../seed/demo/guard';
import { seedDemo } from '../seed/demo/index';
import { seedRequired } from '../seed/required';
import { testEnv } from './env';

/** TIP-B62: seed demo idempotent trên opchub_test, số liệu khớp dữ liệu MSW */
const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 2 });

const snapshot = async () => ({
  groups: await db.group.count({ where: { deletedAt: null } }),
  users: await db.user.count(),
  members: await db.groupMember.count(),
  rooms: await db.room.count(),
  messages: await db.message.count(),
  reactions: await db.messageReaction.count(),
  events: await db.event.count(),
  regs: await db.eventRegistration.count(),
  projects: await db.project.count(),
  comments: await db.projectComment.count(),
  interests: await db.investorInterest.count(),
  investors: await db.investorSummary.count(),
  personas: await db.persona.count(),
  scripts: await db.botScript.count(),
  threads: await db.botThread.count(),
  requests: await db.serviceRequest.count(),
  campaigns: await db.campaign.count(),
  mails: await db.mailLog.count(),
  notifications: await db.notification.count(),
  reports: await db.report.count(),
  audit: await db.auditLog.count({ where: { id: { startsWith: 'demo-lg' } } }),
  admins: await db.adminUser.count({ where: { deletedAt: null } }),
  adminRoles: await db.adminRole.count(),
  adminGrants: await db.adminRolePermission.count(),
});

describe('seed demo (TIP-B62)', () => {
  let first: Awaited<ReturnType<typeof snapshot>>;

  beforeAll(async () => {
    assertDemoDatabase(testEnv.TEST_DATABASE_URL);
    await seedDemo(db);
    first = await snapshot();
    // Giả lập e2e ghi bậy rồi chạy lại → phải về đúng mốc demo
    await db.message.create({ data: { roomId: 'c1-general', senderId: 'm1', body: 'e2e rác' } });
    await db.group.update({ where: { id: 'c3' }, data: { deletedAt: new Date(), memberCount: 1 } });
    await db.membershipFee.update({ where: { userId: 'm6' }, data: { status: 'active' } });
    // e2e tạo TK quản trị + vai trò tự tạo + sửa ma trận → seed lại phải về mốc
    const lecturer = await db.adminRole.findUniqueOrThrow({ where: { key: 'lecturer' } });
    await db.adminRolePermission.deleteMany({ where: { roleId: lecturer.id } });
    const extra = await db.adminRole.create({ data: { name: 'Vai trò e2e rác' } });
    await db.adminUser.create({
      data: { name: 'e2e', email: 'e2e-rac@noibo.vn', roleId: extra.id, passwordHash: 'x' },
    });
    await seedDemo(db);
  }, 120_000);

  afterAll(async () => {
    await db.$disconnect();
  });

  it('chạy lần 2 (sau khi dữ liệu bị đổi) cho đúng số dòng như lần 1', async () => {
    expect(await snapshot()).toEqual(first);
    expect(first.audit).toBe(6);
  });

  it('90 nhóm còn sống (34 tỉnh + 56 ngành, D-89), member_count theo prototype', async () => {
    expect(first.groups).toBe(90);
    const g1 = await db.group.findUniqueOrThrow({ where: { id: 'g1' } });
    expect(g1).toMatchObject({
      name: 'OPC Hà Nội – Công nghệ & AI',
      kind: 'industry',
      industry: 'Công nghệ & AI',
      parentId: 'c1',
      memberCount: 275,
    });
    const c1 = await db.group.findUniqueOrThrow({ where: { id: 'c1' } });
    expect(c1.name).toBe('OPC Hà Nội');
    expect(c1.memberCount).toBeGreaterThan(1000);
    const c3 = await db.group.findUniqueOrThrow({ where: { id: 'c3' } });
    expect(c3.deletedAt).toBeNull();
  });

  it('M1–M8 + phí đúng mock; m4 bị khoá; mật khẩu prototype', async () => {
    const rows = await db.user.findMany({
      where: { id: { in: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'] } },
      select: {
        id: true,
        status: true,
        memberCode: true,
        membershipFee: { select: { status: true } },
      },
      orderBy: { id: 'asc' },
    });
    expect(rows.map((r) => [r.id, r.membershipFee?.status, r.status])).toEqual([
      ['m1', 'active', 'active'],
      ['m2', 'active', 'active'],
      ['m3', 'expiring', 'active'],
      ['m4', 'expired', 'locked'],
      ['m5', 'active', 'active'],
      // D-94 2A: m6 chưa đóng phí, tham gia > 90 ngày → hết miễn phí 3 tháng
      ['m6', 'expired', 'active'],
      ['m7', 'active', 'active'],
      ['m8', 'active', 'active'],
    ]);
    expect(rows[0]?.memberCode).toBe('TV000001');
    const m1 = await db.user.findUniqueOrThrow({ where: { email: 'an.nguyen@mediasoft.vn' } });
    expect(await verify(m1.passwordHash ?? '', 'User@2026')).toBe(true);
    const admin = await db.adminUser.findUniqueOrThrow({
      where: { email: 'admin@opchub.community' },
    });
    expect(await verify(admin.passwordHash ?? '', 'Admin@2026')).toBe(true);
    const unpaid = await db.user.findUniqueOrThrow({ where: { email: 'do.haiyen@opchub.vn' } });
    expect(unpaid.id).toBe('m6');
  });

  it('Admin Thành viên: 8 tài khoản (hồ sơ phụ xoá mềm, NĐT không liệt kê)', async () => {
    const n = await db.user.count({
      where: {
        deletedAt: null,
        accountType: { in: ['personal', 'business'] },
        systemRole: { not: 'super_admin' },
      },
    });
    expect(n).toBe(8);
  });

  it('phòng của c1 gồm qa, docs, events + general; tin + ghim', async () => {
    const slugs = await db.room.findMany({ where: { groupId: 'c1' }, select: { slug: true } });
    expect(slugs.map((r) => r.slug).sort()).toEqual(['docs', 'events', 'general', 'qa']);
    expect(await db.room.findUnique({ where: { id: 'c1-qa' } })).not.toBeNull();
    expect(await db.message.count({ where: { roomId: 'c1-general', hiddenAt: null } })).toBe(4);
    expect(await db.pinnedMessage.count({ where: { messageId: 'c1-general-0' } })).toBe(1);
    // D-71: không còn yêu cầu chờ duyệt — mọi dòng group_members là thành viên
    expect(await db.groupMember.count({ where: { status: { not: 'member' } } })).toBe(0);
  });

  it('sự kiện e1–e5, dự án p1–p15 (v4), persona/kịch bản, phiếu YC, chiến dịch', async () => {
    const e = await db.event.findMany({
      select: { id: true, registeredCount: true },
      orderBy: { id: 'asc' },
    });
    expect(e.map((x) => x.id)).toEqual(['e1', 'e2', 'e3', 'e4', 'e5']);
    expect(e.find((x) => x.id === 'e2')?.registeredCount).toBe(8);
    expect(first.projects).toBe(15);
    expect(await db.project.count({ where: { status: 'published' } })).toBe(11);
    expect(first.personas).toBe(6);
    expect(first.scripts).toBe(3);
    expect(first.requests).toBe(5);
    expect(first.campaigns).toBe(4);
    expect(first.investors).toBe(4);
    expect(first.reports).toBe(4);
  });

  it('REQ-408 D-60 15 dịch vụ V4 là seed bắt buộc, phiếu demo trỏ đúng dịch vụ', async () => {
    const svc = await db.service.findMany({
      select: { id: true, name: true },
      orderBy: { sort: 'asc' },
    });
    expect(svc.map((x) => x.id)).toEqual([
      ...['comm', 'train', 'tools', 'b2b', 'org', 'event', 'setup', 'store', 'match'],
      ...['aikit', 'mkt', 'export', 'fund', 'data', 'space'],
    ]);
    expect(svc.find((x) => x.id === 'tools')?.name).toBe('Công cụ & Giải pháp số');
    const reqs = await db.serviceRequest.findMany({ select: { code: true, serviceId: true } });
    expect(Object.fromEntries(reqs.map((r) => [r.code, r.serviceId]))).toMatchObject({
      'YC-1005': 'train',
      'YC-1004': 'org',
      'YC-1002': 'tools',
      'YC-1001': 'b2b',
    });
    // Seed bắt buộc (mọi môi trường) tạo lại dịch vụ bị thiếu, không ghi đè dịch vụ Admin đã sửa
    await db.service.update({ where: { id: 'train' }, data: { name: 'Admin đổi tên' } });
    await db.service.delete({ where: { id: 'comm' } });
    await seedRequired(db, 'Admin@2026');
    expect(await db.service.count({ where: { id: { in: ['comm', 'train'] } } })).toBe(2);
    expect((await db.service.findUniqueOrThrow({ where: { id: 'train' } })).name).toBe(
      'Admin đổi tên',
    );
    await seedDemo(db);
  }, 120_000);

  it('TIP-V2-201 REQ-616 6 TK quản trị, 5 vai trò hệ thống, ma trận §21.2, Super Admin giữ id', async () => {
    expect(first.admins).toBe(6);
    expect(first.adminRoles).toBe(5);
    // 26 + 7 + 12 + 8 (Super Admin không lưu dòng; V4-606: admin + biên tập có thêm stores.*;
    // V4-614: admin + kế toán có thêm reports.view; V46-801: admin thêm affiliate.gdv)
    expect(first.adminGrants).toBe(54);
    const directorGrants = await db.adminRolePermission.findMany({
      where: { permissionKey: 'affiliate.gdv' },
      select: { role: { select: { key: true } } },
    });
    expect(directorGrants.map((grant) => grant.role.key)).toEqual(['admin']);
    const rows = await db.adminUser.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        email: true,
        mustChangePwd: true,
        passwordHash: true,
        role: { select: { key: true } },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    expect(rows.map((r) => [r.email, r.role?.key])).toEqual([
      ['admin@opchub.community', 'super_admin'],
      ['trang.pham@opchub.community', 'admin'],
      ['yen.do@opchub.community', 'lecturer'],
      ['quan.vu@opchub.community', 'lecturer'],
      ['mai.hoang@opchub.community', 'accountant'],
      ['hang.ngo@opchub.community', 'editor'],
    ]);
    expect(rows.every((r) => !r.mustChangePwd)).toBe(true);
    // Super Admin cùng id với dòng `users` cũ (xoá mềm, email `admin@moved.invalid` — V2Q-122)
    expect(rows[0]?.id).toBe('admin');
    const user = await db.user.findUniqueOrThrow({ where: { id: 'admin' } });
    expect([user.email, user.deletedAt !== null]).toEqual(['admin@moved.invalid', true]);
    expect(await verify(rows[0]?.passwordHash ?? '', 'Admin@2026')).toBe(true);
    expect(await verify(rows[2]?.passwordHash ?? '', 'Admin@2026')).toBe(true);
  });
});
