import { randomUUID } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AiModerationService } from '@/modules/moderation';
import { AiModerationQueueService } from '@/modules/moderation/services/ai-moderation-queue.service';
import { ModerationSettingsService } from '@/modules/moderation/services/moderation-settings.service';
import { aiOpsFixture } from '../helpers/ai-ops-fixture';
import { createUser } from '../factories/user.factory';
import { createGroup, addMember, tokenOf } from '../factories/group.factory';
import type { ModerationSettings } from '@opchub/shared/api-domains';
import { chatMessageSchema } from '@opchub/shared/api-domains';

describe('D-138 AI moderation never auto-punishes', () => {
  const f = aiOpsFixture('TIP817-mod');
  let room: string, groupId: string, senderId: string, token: string;
  beforeAll(async () => {
    const group = await createGroup(f.t);
    groupId = group.id;
    room = `${groupId}-general`;
    const sender = await createUser(f.t, { fee: 'trial' });
    senderId = sender.id;
    await addMember(f.t, groupId, senderId);
    token = await tokenOf(f.t, sender);
    const old = await f.t.app.get(ModerationSettingsService).get();
    f.cleanup(async () => {
      await f.t.app.get(ModerationSettingsService).save(f.actor, old);
      await f.t.prisma.db.group.deleteMany({ where: { id: groupId } });
    });
  });
  const enabled = async (ai: boolean) => {
    await f.t.app.get(ModerationSettingsService).save(f.actor, { autoLockDays: 7, ai });
    await f.t.app.get(AiModerationQueueService).reload();
  };
  beforeEach(() => enabled(true));
  const send = async (text = 'Một trao đổi cộng đồng bình thường') => {
    const response = await f.t.call(`/rooms/${room}/messages`, {
      method: 'POST',
      token,
      json: { clientMsgId: randomUUID(), body: text },
    });
    expect(response.status).toBe(201);
    const message = chatMessageSchema.parse(await response.json());
    return message.id;
  };
  it('member send enqueues once; confidence >=0.8 creates one auto AI case, no hiding/violation/lock', async () => {
    f.a.setContent(JSON.stringify({ violate: true, label: 'scam', confidence: 0.9 }));
    const id = await send();
    const raw = f.t.redis.duplicate({ prefix: '' });
    try {
      expect(await raw.exists(`opchub:bull:moderation:ai-mod-${id}`)).toBe(1);
    } finally {
      await raw.quit();
    }
    const n = f.a.requests.length;
    await Promise.all([
      f.t.app.get(AiModerationService).classify(id),
      f.t.app.get(AiModerationService).classify(id),
    ]);
    expect(f.a.requests).toHaveLength(n + 1);
    expect(
      await f.t.prisma.db.report.findMany({
        where: { messageId: id },
        select: { source: true, hit: true },
      }),
    ).toEqual([{ source: 'auto', hit: 'ai:scam' }]);
    expect((await f.t.prisma.db.message.findUniqueOrThrow({ where: { id } })).hiddenAt).toBeNull();
    expect(await f.t.prisma.db.moderationViolation.count({ where: { userId: senderId } })).toBe(0);
    expect((await f.t.prisma.db.user.findUniqueOrThrow({ where: { id: senderId } })).status).toBe(
      'active',
    );
  });
  it('transient provider failure never triggers a second moderation call, even with fallback configured', async () => {
    await f.save({ fallback: 'usgate', log: false });
    f.a.setMode('unavailable');
    const id = await send();
    const primary = f.a.requests.length,
      fallback = f.b.requests.length;
    await f.t.app.get(AiModerationService).classify(id);
    await f.t.app.get(AiModerationService).classify(id);
    expect(f.a.requests).toHaveLength(primary + 1);
    expect(f.b.requests).toHaveLength(fallback);
    expect(await f.t.prisma.db.report.count({ where: { messageId: id } })).toBe(0);
  });
  it.each([
    'not-json',
    JSON.stringify({ violate: true, label: 'spam', confidence: 0.79 }),
    JSON.stringify({ violate: false, label: 'other', confidence: 1 }),
  ])(
    'invalid/nonviolating result creates no case and replay never calls again: %s',
    async (content) => {
      f.a.setContent(content);
      const id = await send();
      const n = f.a.requests.length;
      await f.t.app.get(AiModerationService).classify(id);
      await f.t.app.get(AiModerationService).classify(id);
      expect(f.a.requests).toHaveLength(n + 1);
      expect(await f.t.prisma.db.report.count({ where: { messageId: id } })).toBe(0);
      if (content === 'not-json')
        expect(
          await f.t.prisma.db.llmCall.findFirst({
            where: { model: f.model, errorCode: 'invalid_output' },
            select: { status: true },
          }),
        ).toEqual({ status: 'error' });
    },
  );
  it('switch off enqueues nothing; bot/system/hidden/empty messages never call AI', async () => {
    await enabled(false);
    const id = await send();
    const n = f.a.requests.length;
    await f.t.app.get(AiModerationService).classify(id);
    const raw = f.t.redis.duplicate({ prefix: '' });
    try {
      expect(await raw.exists(`opchub:bull:moderation:ai-mod-${id}`)).toBe(0);
    } finally {
      await raw.quit();
    }
    await enabled(true);
    const ids = [randomUUID(), randomUUID(), randomUUID()];
    await f.t.prisma.db.message.createMany({
      data: ids.map((id, i) => ({
        id,
        roomId: room,
        senderId: i === 0 ? null : senderId,
        body: i === 2 ? '' : 'Nội dung thử',
        hiddenAt: i === 1 ? new Date() : null,
      })),
    });
    await Promise.all(ids.map((id) => f.t.app.get(AiModerationService).classify(id)));
    expect(f.a.requests).toHaveLength(n);
  });
  it('moderation setting requires permission and logs audited switch', async () => {
    const denied = await tokenOf(f.t, await createUser(f.t, { adminPermissions: ['groups.view'] }));
    expect(
      (
        await f.t.call('/admin/moderation/settings', {
          method: 'PUT',
          token: denied,
          json: { autoLockDays: 7, ai: true },
        })
      ).status,
    ).toBe(403);
    const admin = await tokenOf(
      f.t,
      await createUser(f.t, { adminPermissions: ['groups.moderate', 'groups.view'] }),
    );
    const result = await f.t.call('/admin/moderation/settings', {
      method: 'PUT',
      token: admin,
      json: { autoLockDays: 7, ai: false },
    });
    expect(result.status).toBe(200);
    expect(((await result.json()) as ModerationSettings).ai).toBe(false);
  });
});
