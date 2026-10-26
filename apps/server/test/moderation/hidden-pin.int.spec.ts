import {
  chatMessagePageSchema,
  chatMessageSchema,
  HIDDEN_MESSAGE_TEXT,
  roomPinSchema,
} from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const pinsSchema = z.object({ items: z.array(roomPinSchema) });

/** D-77 / D-89 (prototype v4): tin đã ghim bị báo cáo → vẫn trong thanh ghim, nội dung thay câu giữ chỗ */
describe('Ghim của tin bị ẩn (V4-618)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(() => flushAuthState(t));
  afterAll(async () => {
    await removeTestGroups(t);
    await t.close();
  });

  it('tin thành viên ẩn giữ ghim + không lộ nội dung; tin bot ẩn thì bỏ khỏi ghim', async () => {
    const g = await createGroup(t);
    const room = `${g.id}-general`;
    const [owner, sender, reporter] = await Promise.all([
      createUser(t, { fee: 'active' }),
      createUser(t, { fee: 'active' }),
      createUser(t, { fee: 'active' }),
    ]);
    await addMember(t, g.id, owner.id, 'owner');
    for (const u of [sender, reporter]) await addMember(t, g.id, u.id);
    const ownerTk = await tokenOf(t, owner);
    const msg = chatMessageSchema.parse(
      await (
        await t.call(`/rooms/${room}/messages`, {
          method: 'POST',
          token: await tokenOf(t, sender),
          json: { clientMsgId: randomUUID(), body: 'Nội dung gốc cần ghim' },
        })
      ).json(),
    );
    const pin = await t.call(`/messages/${msg.id}/pin`, {
      method: 'PUT',
      token: ownerTk,
      json: { pinned: true },
    });
    expect(pin.status).toBeLessThan(300);
    const react = (emoji: string) =>
      t.call(`/messages/${msg.id}/reactions`, { method: 'POST', token: ownerTk, json: { emoji } });
    expect((await react('👍')).status).toBeLessThan(300);
    const report = await t.call(`/messages/${msg.id}/report`, {
      method: 'POST',
      token: await tokenOf(t, reporter),
      json: { reason: 'spam' },
    });
    expect(report.status).toBeLessThan(300);

    const pins = async () =>
      pinsSchema.parse(await (await t.call(`/rooms/${room}/pins`, { token: ownerTk })).json())
        .items;
    expect(await pins()).toEqual([
      expect.objectContaining({ messageId: msg.id, text: HIDDEN_MESSAGE_TEXT }),
    ]);
    // Luồng tin: không lộ nội dung, giữ cảm xúc + "Đã ghim"; không thả thêm cảm xúc
    const page = chatMessagePageSchema.parse(
      await (await t.call(`/rooms/${room}/messages`, { token: ownerTk })).json(),
    );
    expect(page.items.find((m) => m.id === msg.id)).toMatchObject({
      body: '',
      pinned: true,
      reactions: [expect.objectContaining({ emoji: '👍', count: 1 })],
    });
    expect((await react('❤️')).status).toBe(409);

    await t.prisma.db.message.update({ where: { id: msg.id }, data: { isSimulated: true } });
    expect(await pins()).toEqual([]);
  });
});
