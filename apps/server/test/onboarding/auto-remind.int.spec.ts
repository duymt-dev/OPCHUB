import { onboardingAutoRemindSchema, onboardingAutoRemindTitle } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingAutoRemindService, OnboardingService, vnDayStart } from '@/modules/onboarding';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

/**
 * TIP-V42-708 (D-100 / D-115, prototype v4.2 `_obAutoRemind`): lần mở Portal đầu tiên trong ngày VN, còn thiếu bước
 * → một thông báo trong app (không email), ≤ 1 lần / ngày / người; đủ 8 bước thì không nhắc.
 */
describe('Tự nhắc khởi đầu (TIP-V42-708)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
  });
  beforeEach(() => flushAuthState(t));
  afterAll(() => t.close());

  const autoRemind = async (token: string) => {
    const res = await t.call('/me/onboarding/auto-remind', { method: 'POST', token });
    expect(res.status).toBe(200);
    return onboardingAutoRemindSchema.parse(await res.json()).reminded;
  };
  const notesOf = (userId: string) =>
    t.prisma.db.notification.findMany({
      where: { userId, type: 'system', link: '/dashboard' },
      select: { title: true, body: true },
    });

  it('mở Portal hai lần trong ngày → một thông báo (không email); ngày sau thêm một', async () => {
    const m = await createUser(t, { accountType: 'business', fee: 'trial' });
    const token = await tokenOf(t, m);
    expect(await autoRemind(token)).toBe(true);
    expect(await autoRemind(token)).toBe(false);
    const notes = await notesOf(m.id);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.title).toMatch(/^Bạn còn \d bước khởi đầu chưa hoàn tất$/);
    expect(notes[0]?.body).toMatch(
      /^Còn thiếu: .+\. Hoàn tất để kết nối hiệu quả hơn với cộng đồng\.$/,
    );
    const rows = await t.prisma.db.onboardingReminder.findMany({ where: { userId: m.id } });
    expect(rows).toEqual([expect.objectContaining({ kind: 'auto', sentBy: null, mailedAt: null })]);
    const mails = await t.prisma.db.outboxEvent.count({
      where: { type: 'onboarding.reminded', payload: { path: ['userId'], equals: m.id } },
    });
    expect(mails).toBe(0);

    // Ngày VN kế tiếp (lượt hôm qua lùi về trước 00:00 VN hôm nay)
    const yesterday = new Date(vnDayStart(new Date()).getTime() - 3_600_000);
    await t.prisma.db.onboardingReminder.updateMany({
      where: { userId: m.id },
      data: { sentAt: yesterday },
    });
    expect(await autoRemind(token)).toBe(true);
    expect(await notesOf(m.id)).toHaveLength(2);
  });

  it('hai tab cùng lúc → một lần nhắc (khoá theo người); lượt tự nhắc không chặn Admin nhắc', async () => {
    const m = await createUser(t, { accountType: 'personal', fee: 'trial' });
    const token = await tokenOf(t, m);
    const both = await Promise.all([autoRemind(token), autoRemind(token)]);
    expect(both.filter(Boolean)).toHaveLength(1);
    expect(await notesOf(m.id)).toHaveLength(1);
    const admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    const res = await t.call(`/admin/users/${m.id}/onboarding-remind`, {
      method: 'POST',
      token: admin,
    });
    expect(res.status).toBe(204);
  });

  it('đủ 8 bước hoặc NĐT → không nhắc; ranh giới ngày theo giờ Việt Nam', async () => {
    const svc = t.app.get(OnboardingAutoRemindService);
    const inv = await createUser(t, { accountType: 'investor' });
    expect(await svc.remind(inv.id)).toBe(false);
    const m = await createUser(t, { accountType: 'business', fee: 'active' });
    const real = t.app.get(OnboardingService);
    const state = await real.mine(m.id);
    if (!state) throw new Error('thiếu tiến độ');
    const spy = vi.spyOn(real, 'mine').mockResolvedValue({
      ...state,
      done: 8,
      steps: state.steps.map((x) => ({ ...x, done: true })),
    });
    try {
      expect(await svc.remind(m.id)).toBe(false);
    } finally {
      spy.mockRestore();
    }
    expect(await t.prisma.db.onboardingReminder.count({ where: { userId: m.id } })).toBe(0);
    expect(onboardingAutoRemindTitle(3)).toBe('Bạn còn 3 bước khởi đầu chưa hoàn tất');
    // 16:59:59Z = 23:59:59 VN; 17:00Z = 00:00 VN hôm sau
    expect(vnDayStart(new Date('2026-10-28T16:59:59Z')).toISOString()).toBe(
      '2026-10-27T17:00:00.000Z',
    );
    expect(vnDayStart(new Date('2026-10-28T17:00:00Z')).toISOString()).toBe(
      '2026-10-28T17:00:00.000Z',
    );
  });
});
