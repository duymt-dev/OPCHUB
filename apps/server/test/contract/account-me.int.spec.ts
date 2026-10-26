import { declarationDraftSchema, meSchema, otpSentSchema } from '@opchub/shared/api';
import {
  chatMessageSchema,
  dashboardLiveSchema,
  memberSuggestionSchema,
  notificationListSchema,
  notificationReadResultSchema,
  profileSchema,
  reportSchema,
  requesterProfileSchema,
  ssoLinkResultSchema,
} from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { NotificationService } from '@/modules/notification';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { ep } from './harness';

/** Như apps/portal/src/features/projects/api.ts */
const items = <T extends z.ZodType>(s: T) => z.object({ items: z.array(s) });

/**
 * Contract `account` Portal (10) + `notification` (2) + `reporting` `/dashboard/live` — schema
 * đúng như apps/portal/src/features/{profile,services,projects,chat,shell,dashboard}/….
 */
describe('Contract: account (me, tin nhắn), notification, dashboard', () => {
  let t: TestApp;
  let owner: { id: string; token: string };
  let member: { id: string; token: string };
  let room: string;
  let groupId: string;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    const g = await createGroup(t);
    room = `${g.id}-general`;
    groupId = g.id;
    const o = await createUser(t, { fee: 'active' });
    const m = await createUser(t, { fee: 'active' });
    await addMember(t, g.id, o.id, 'owner');
    await addMember(t, g.id, m.id);
    owner = { id: o.id, token: await tokenOf(t, o) };
    member = { id: m.id, token: await tokenOf(t, m) };
  });
  afterAll(async () => {
    await t.prisma.db.notification.deleteMany({ where: { userId: { in: [member.id] } } });
    await removeTestGroups(t);
    await t.close();
  });

  it('hồ sơ: GET/PATCH /me, liên kết/huỷ SSO, gợi ý thành viên', async () => {
    const me = await ep(t, 'GET', '/me', '/me', profileSchema, { token: member.token });
    expect(me.data.id).toBe(member.id);
    await ep(t, 'GET', '/me', '/me', requesterProfileSchema, { token: member.token });
    const patched = await ep(t, 'PATCH', '/me', '/me', profileSchema, {
      token: member.token,
      json: { city: 'Hà Nội' },
    });
    expect(patched.data.city).toBe('Hà Nội');

    const linked = await ep(
      t,
      'POST',
      '/me/sso/:provider',
      '/me/sso/facebook',
      ssoLinkResultSchema,
      { token: member.token },
    );
    expect(linked.data.linked).toBe(true);
    const unlinked = await ep(
      t,
      'DELETE',
      '/me/sso/:provider',
      '/me/sso/facebook',
      ssoLinkResultSchema,
      { token: member.token },
    );
    expect(unlinked.data.linked).toBe(false);

    await ep(
      t,
      'GET',
      '/members/suggest',
      `/members/suggest?q=${encodeURIComponent('Người thử')}`,
      items(memberSuggestionSchema),
      { token: member.token },
    );
  });

  it('V4-607 khai báo: GET bản nháp, PUT lưu → me.needsDeclaration = false', async () => {
    const u = await createUser(t);
    const token = await tokenOf(t, u);
    const draft = await ep(t, 'GET', '/me/declaration', '/me/declaration', declarationDraftSchema, {
      token,
    });
    expect(draft.data.business).toBeNull();
    const saved = await ep(t, 'PUT', '/me/declaration', '/me/declaration', meSchema, {
      token,
      json: { accountType: 'personal', persona: 'engineer', groupIds: [groupId] },
    });
    expect(saved.data.needsDeclaration).toBe(false);
  });

  it('BUG-030 đổi email: gửi OTP tới email mới → xác nhận → hồ sơ', async () => {
    const u = await createUser(t, { fee: 'active' });
    const token = await tokenOf(t, u);
    const newEmail = `ct-moi-${Date.now().toString(36)}@test.opchub.vn`;
    const sent = await ep(t, 'POST', '/me/email/otp', '/me/email/otp', otpSentSchema, {
      token,
      json: { newEmail },
    });
    expect(sent.data.email).toBe(newEmail);
    // OTP_FIXED_CODE của test (setup/env.ts)
    const done = await ep(t, 'POST', '/me/email/verify', '/me/email/verify', profileSchema, {
      token,
      json: { newEmail, code: '123456' },
    });
    expect(done.data.email).toBe(newEmail);
  });

  it('tin nhắn: thả cảm xúc, ghim (chủ nhóm), báo cáo', async () => {
    const sent = await t.call(`/rooms/${room}/messages`, {
      method: 'POST',
      token: owner.token,
      json: { clientMsgId: randomUUID(), body: 'Tin hợp đồng' },
    });
    const msg = chatMessageSchema.parse(await sent.json());

    const reacted = await ep(
      t,
      'POST',
      '/messages/:id/reactions',
      `/messages/${msg.id}/reactions`,
      chatMessageSchema,
      { token: member.token, json: { emoji: '👍' } },
    );
    expect(reacted.data.reactions).toHaveLength(1);
    const pinned = await ep(
      t,
      'PUT',
      '/messages/:id/pin',
      `/messages/${msg.id}/pin`,
      chatMessageSchema,
      { token: owner.token, json: { pinned: true } },
    );
    expect(pinned.data.pinned).toBe(true);
    const rep = await ep(
      t,
      'POST',
      '/messages/:id/report',
      `/messages/${msg.id}/report`,
      reportSchema,
      { token: member.token, json: { reason: 'scam' } },
      201,
    );
    expect(rep.data.reporterCount).toBe(1);
  });

  it('thông báo: danh sách → đánh dấu đã đọc; dashboard live', async () => {
    await t.app
      .get(NotificationService)
      .notify([{ userId: member.id, type: 'group', title: 'Hợp đồng', body: '', link: '/' }]);
    const list = await ep(
      t,
      'GET',
      '/notifications',
      '/notifications?size=50',
      notificationListSchema,
      { token: member.token },
    );
    expect(list.data.unread).toBeGreaterThanOrEqual(1);
    const read = await ep(
      t,
      'POST',
      '/notifications/read',
      '/notifications/read',
      notificationReadResultSchema,
      { token: member.token, json: {} },
    );
    expect(read.data.unread).toBe(0);

    await ep(t, 'GET', '/dashboard/live', '/dashboard/live', dashboardLiveSchema, {
      token: member.token,
    });
  });
});
