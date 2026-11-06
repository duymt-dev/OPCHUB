import { FakeStorageProvider } from '@opchub/integrations';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STORAGE } from '@/common/integrations';
import { HousekeepingService, SystemCoreModule } from '@/modules/system';
import { GC_GRACE_MS, MediaGcService } from '@/modules/uploads';
import { createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const DAY = 86_400_000;

/** TIP-V2-306 — NA-13 job dọn 02:00 (+ NA-14, NA-26, NA-08) */
describe('Dọn dữ liệu 02:00 (NA-13)', () => {
  let t: TestApp;
  const storage = new FakeStorageProvider();
  const personaId = `ps-hk-${randomUUID().slice(0, 8)}`;
  const run = (now = new Date()) => t.app.get(HousekeepingService).run(now);

  beforeAll(async () => {
    t = await createTestApp({ imports: [SystemCoreModule], overrides: [[STORAGE, storage]] });
    await t.prisma.db.persona.create({ data: { id: personaId, name: 'Persona dọn' } });
  });
  beforeEach(async () => {
    await flushAuthState(t);
  });
  afterAll(async () => {
    await removeTestGroups(t);
    await t.prisma.db.persona.deleteMany({ where: { id: personaId } });
    await t.close();
  });

  it('REQ-213 NA-08 giữ 120 tin mô phỏng mới nhất/phòng; tin người thật không đụng', async () => {
    const g = await createGroup(t);
    const room = `${g.id}-general`;
    const u = await createUser(t, { fee: 'active' });
    const t0 = Date.now() - 3 * DAY;
    await t.prisma.db.message.createMany({
      data: [
        ...Array.from({ length: 130 }, (_, i) => ({
          roomId: room,
          personaId,
          isSimulated: true,
          body: `bot ${i}`,
          clientMsgId: `hk-${g.id}-${i}`,
          createdAt: new Date(t0 + i * 1000),
        })),
        ...Array.from({ length: 5 }, (_, i) => ({
          roomId: room,
          senderId: u.id,
          body: `người ${i}`,
          clientMsgId: `hk-u-${g.id}-${i}`,
          createdAt: new Date(t0 + i * 500),
        })),
      ],
    });
    await run();
    const live = await t.prisma.db.message.findMany({
      where: { roomId: room, deletedAt: null },
      select: { isSimulated: true, body: true },
    });
    expect(live.filter((m) => m.isSimulated)).toHaveLength(120);
    expect(live.filter((m) => !m.isSimulated)).toHaveLength(5);
    // 10 tin cũ nhất (bot 0–9) bị xoá mềm
    expect(live.some((m) => m.body === 'bot 9')).toBe(false);
    expect(live.some((m) => m.body === 'bot 10')).toBe(true);
  });

  it('REQ-213 token hết hạn / thu hồi > 7 ngày bị xoá; còn hạn giữ', async () => {
    const u = await createUser(t, { fee: 'active' });
    await tokenOf(t, u);
    const fam = randomUUID();
    const old = await t.prisma.db.refreshToken.create({
      data: {
        userId: u.id,
        familyId: fam,
        tokenHash: `hk-old-${fam}`,
        expiresAt: new Date(Date.now() - 8 * DAY),
      },
    });
    const revoked = await t.prisma.db.refreshToken.create({
      data: {
        userId: u.id,
        familyId: fam,
        tokenHash: `hk-rev-${fam}`,
        expiresAt: new Date(Date.now() + DAY),
        revokedAt: new Date(Date.now() - 8 * DAY),
      },
    });
    await run();
    const left = await t.prisma.db.refreshToken.findMany({ where: { userId: u.id } });
    expect(left.some((r) => r.id === old.id || r.id === revoked.id)).toBe(false);
    // phiên đăng nhập vừa tạo còn nguyên
    expect(left.length).toBeGreaterThanOrEqual(1);
  });

  it('REQ-214 NA-14 file xuất quá 1 giờ bị xoá khỏi storage, file_key = NULL, dòng còn giữ', async () => {
    const admin = await createUser(t, { systemRole: 'admin' });
    const key = `exports/hk-${randomUUID()}.csv`;
    await storage.put(key, 'a,b', 'text/csv');
    const job = await t.prisma.db.exportJob.create({
      data: {
        kind: 'users',
        params: { kind: 'users' },
        requestedBy: admin.id,
        status: 'done',
        fileKey: key,
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    const fresh = `exports/hk-${randomUUID()}.csv`;
    await storage.put(fresh, 'a,b', 'text/csv');
    const keep = await t.prisma.db.exportJob.create({
      data: {
        kind: 'users',
        params: { kind: 'users' },
        requestedBy: admin.id,
        status: 'done',
        fileKey: fresh,
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    await run();
    expect(storage.objects.has(key)).toBe(false);
    expect(
      (await t.prisma.db.exportJob.findUniqueOrThrow({ where: { id: job.id } })).fileKey,
    ).toBeNull();
    expect(storage.objects.has(fresh)).toBe(true);
    expect(
      (await t.prisma.db.exportJob.findUniqueOrThrow({ where: { id: keep.id } })).fileKey,
    ).toBe(fresh);
    await t.prisma.db.exportJob.deleteMany({ where: { requestedBy: admin.id } });
  });

  it('REQ-226 NA-26 ảnh bị thay xoá sau 24h; ảnh còn được tham chiếu thì giữ', async () => {
    const u = await createUser(t, { fee: 'active' });
    const base = storage.publicUrl('');
    const a = `avatar/${u.id}/a-${randomUUID()}.png`;
    const shared = `avatar/${u.id}/s-${randomUUID()}.png`;
    await storage.put(a, 'x', 'image/png');
    await storage.put(shared, 'x', 'image/png');
    const gc = t.app.get(MediaGcService);
    await t.prisma.db.$transaction(async (tx) => {
      await gc.enqueueReplaced(tx, `${base}${a}`, `${base}b.png`, 'avatar');
      await gc.enqueueReplaced(tx, `${base}${shared}`, null, 'avatar');
      // data URL / URL ngoài / trùng ảnh → không enqueue
      await gc.enqueueReplaced(tx, 'data:image/png;base64,AA', null, 'avatar');
      await gc.enqueueReplaced(tx, `${base}${a}`, `${base}${a}`, 'avatar');
    });
    // ảnh `shared` vẫn đang là avatar của người khác
    const other = await createUser(t);
    await t.prisma.db.user.update({
      where: { id: other.id },
      data: { avatarUrl: `${base}${shared}` },
    });

    // chưa qua ân hạn → chưa xoá
    await run();
    expect(storage.objects.has(a)).toBe(true);
    await run(new Date(Date.now() + GC_GRACE_MS + 60_000));
    expect(storage.objects.has(a)).toBe(false);
    expect(storage.objects.has(shared)).toBe(true);
    expect(await t.prisma.db.storageGc.count({ where: { key: { in: [a, shared] } } })).toBe(0);
  });

  it('REQ-226 đổi avatar qua PATCH /me → ảnh cũ vào hàng dọn (cùng transaction)', async () => {
    const u = await createUser(t, { fee: 'active' });
    const base = storage.publicUrl('');
    const prev = `${base}avatar/${u.id}/old.png`;
    await t.prisma.db.user.update({ where: { id: u.id }, data: { avatarUrl: prev } });
    const tk = await tokenOf(t, u);
    const r = await t.call('/me', { method: 'PATCH', token: tk, json: { avatarUrl: null } });
    expect(r.status).toBe(200);
    expect(
      await t.prisma.db.storageGc.findUnique({ where: { key: `avatar/${u.id}/old.png` } }),
    ).not.toBeNull();
  });

  it('REQ-213 chạy 2 lần liên tiếp idempotent (không lỗi, lần 2 không xoá thêm)', async () => {
    await run();
    const r = await run();
    expect(r.simulated).toBe(0);
    expect(r.exports).toBe(0);
  });
  it('REQ-628 aiCalls retains89-day records and deletes older than90 days idempotently', async () => {
    const now = new Date();
    const model = 'TIP811-housekeeping-' + randomUUID();
    try {
      await t.prisma.db.llmCall.createMany({
        data: [89, 91].map((age) => ({
          id: randomUUID(),
          model,
          provider: 'custom',
          purpose: 'bot',
          latencyMs: 1,
          status: 'ok',
          createdAt: new Date(now.getTime() - age * DAY),
        })),
      });
      expect((await run(now)).aiCalls).toBeGreaterThanOrEqual(1);
      const left = await t.prisma.db.llmCall.findMany({
        where: { model },
        select: { createdAt: true },
      });
      expect(left).toEqual([{ createdAt: new Date(now.getTime() - 89 * DAY) }]);
      expect((await run(now)).aiCalls).toBe(0);
    } finally {
      await t.prisma.db.llmCall.deleteMany({ where: { model } });
    }
  });
});
