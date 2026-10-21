import { dashboardLiveSchema, LIVE_FEED_MAX } from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LiveCountersService, PresenceService } from '@/common/realtime';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { expectPersistedMembers, withDashboardLabelsAbsent } from './dashboard-source.fixture';

/** Khoá Redis của Dashboard (dọn trước mỗi ca để số đếm độc lập) */
const KEYS = ['dashboard:blocks', 'dashboard:totals', 'dashboard:feed', 'dashboard:msgs:min'];

describe('Dashboard Portal — số liệu thật (TIP-V2-305, NA-24)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await flushAuthState(t);
    await t.redis.client.del(...KEYS);
  });
  afterAll(async () => {
    await t.redis.client.del(...KEYS);
    await removeTestGroups(t);
    await t.close();
  });

  const live = async (tk: string) =>
    dashboardLiveSchema.parse(await (await t.call('/dashboard/live', { token: tk })).json());

  it('REQ-224 BUG-012 TD-010 không còn dữ liệu mô phỏng prototype; số tổng từ DB', async () => {
    await withDashboardLabelsAbsent(t, async () => {
      const u = await createUser(t, { fee: 'active' });
      const tk = await tokenOf(t, u);
      await t.app.get(PresenceService).usersSeen([u.id]);
      const d = await live(tk);
      const text = JSON.stringify(d);
      // These labels are absent from this explicit persisted-source fixture.
      for (const fake of [
        'Somchai Prasert',
        'Siam AI Labs',
        'Workshop: Tự động hoá bán hàng bằng AI',
      ]) {
        expect(text).not.toContain(fake);
      }
      const [groups, members] = await Promise.all([
        t.prisma.db.group.count({ where: { deletedAt: null } }),
        t.prisma.db.user.count({
          where: { status: 'active', deletedAt: null, systemRole: 'member' },
        }),
      ]);
      expect(d.communityCount).toBe(groups);
      expect(d.stats.totalMembers).toBe(members);
      expect(d.stats.online).toBeGreaterThanOrEqual(1);
      expect(d.countryCount).toBe(d.countries.length);
      await expectPersistedMembers(t, d.members);
    });
  });

  it('REQ-224 NA-24 tin vừa gửi vào hoạt động trực tiếp + đếm tin hôm nay / phút qua', async () => {
    const g = await createGroup(t, { name: `Nhóm live ${randomUUID().slice(0, 6)}` });
    const u = await createUser(t, { fee: 'active' });
    await addMember(t, g.id, u.id);
    const tk = await tokenOf(t, u);
    const before = await live(tk);
    const r = await t.call(`/rooms/${g.id}-general/messages`, {
      method: 'POST',
      token: tk,
      json: { clientMsgId: randomUUID(), body: 'Xin chào cả nhóm' },
    });
    expect(r.status).toBe(201);
    const after = await live(tk);
    expect(after.activities[0]).toMatchObject({ kind: 'msg', target: g.name });
    // Không lưu nội dung tin trong feed
    expect(JSON.stringify(after.activities)).not.toContain('Xin chào cả nhóm');
    expect(after.stats.messagesToday).toBe(before.stats.messagesToday + 1);
    expect(after.stats.messagesLastMinute).toBeGreaterThanOrEqual(1);
  });

  it('REQ-224 hoạt động trực tiếp giữ tối đa 50 mục sau 60 sự kiện', async () => {
    const live50 = t.app.get(LiveCountersService);
    for (let i = 0; i < 60; i++) {
      await live50.record('join', { name: `TV ${i}`, avatarUrl: null }, 'Nhóm', `j${i}`);
    }
    expect(await t.redis.client.llen('dashboard:feed')).toBe(LIVE_FEED_MAX);
    const tk = await tokenOf(t, await createUser(t, { fee: 'active' }));
    const d = await live(tk);
    // đăng nhập vừa rồi cũng vào feed → mục mới nhất là login, sau đó TV 59
    expect(d.activities).toHaveLength(LIVE_FEED_MAX);
    expect(d.activities.find((a) => a.kind === 'join')?.memberName).toBe('TV 59');
    expect(d.stats.joinsLastMinute).toBeGreaterThanOrEqual(LIVE_FEED_MAX);
  });

  it('đăng nhập thành viên → mục "đăng nhập" ở hoạt động trực tiếp', async () => {
    const u = await createUser(t, { fee: 'active' });
    const tk = await tokenOf(t, u);
    const name = (await t.prisma.db.user.findUniqueOrThrow({ where: { id: u.id } })).fullName;
    const d = await live(tk);
    expect(d.activities[0]).toMatchObject({ kind: 'login', memberName: name, target: '' });
  });

  it('chưa đóng phí → 402', async () => {
    const tk = await tokenOf(t, await createUser(t, { fee: null }));
    expect((await t.call('/dashboard/live', { token: tk })).status).toBe(402);
  });
});
