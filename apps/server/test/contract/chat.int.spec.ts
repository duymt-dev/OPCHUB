import {
  chatMessagePageSchema,
  chatMessageSchema,
  chatOverviewSchema,
  chatRoomSchema,
  roomFileSchema,
  roomMembersSchema,
  roomPinSchema,
} from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { addMember, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { STORAGE } from '@/common/integrations';
import { type TempStorage, tempStorage, uploadPng } from '../uploads/storage.helper';
import { ep } from './harness';
import { createContractGroup } from './lane-b.helpers';

const items = <T extends z.ZodType>(item: T) => z.object({ items: z.array(item) });
const idOnly = z.object({ id: z.string() });

/** Contract `chat` (8) — schema đúng như apps/portal/src/features/chat/{api,transport}.ts */
describe('Contract: chat', () => {
  let t: TestApp;
  let store: TempStorage;
  const groupIds: string[] = [];
  beforeAll(async () => {
    store = await tempStorage();
    t = await createTestApp({ overrides: [[STORAGE, store.provider]] });
    await flushAuthState(t);
  });
  afterAll(async () => {
    await t.prisma.db.group.deleteMany({ where: { id: { in: groupIds } } });
    await t.close();
    await store.dispose();
  });

  it('portal: tổng quan → gửi → lịch sử → thành viên/ghim/tệp → đã đọc → xoá chủ đề', async () => {
    const g = await createContractGroup(t);
    groupIds.push(g.id);
    const owner = await createUser(t, { fee: 'active' });
    const mem = await createUser(t, { fee: 'active' });
    await addMember(t, g.id, owner.id, 'owner');
    await addMember(t, g.id, mem.id);
    const ownerTk = await tokenOf(t, owner);
    const memTk = await tokenOf(t, mem);
    const room = `${g.id}-general`;

    await ep(t, 'GET', '/me/chat', '/me/chat', chatOverviewSchema, { token: memTk });

    const sent = await ep(
      t,
      'POST',
      '/rooms/:id/messages',
      `/rooms/${room}/messages`,
      chatMessageSchema,
      { token: memTk, json: { clientMsgId: randomUUID(), body: 'Xin chào hợp đồng' } },
      201,
    );
    // TIP-V2-111: tệp đính kèm phải là object đã PUT qua presign (ảnh PNG cũng thuộc whitelist chat-file)
    const url = await uploadPng(t, memTk, 'chat-file', 1024);
    const posted = await t.call(`/rooms/${room}/messages`, {
      method: 'POST',
      token: memTk,
      json: {
        clientMsgId: randomUUID(),
        kind: 'file',
        attachment: { name: 'Hop-dong.pdf', size: '', ext: '', url, bytes: 1024 },
      },
    });
    expect(posted.status).toBe(201);
    const pin = await t.call(`/messages/${sent.data.id}/pin`, {
      method: 'PUT',
      token: ownerTk,
      json: { pinned: true },
    });
    expect(pin.status).toBe(200);

    const page = await ep(
      t,
      'GET',
      '/rooms/:id/messages',
      `/rooms/${room}/messages?size=50`,
      chatMessagePageSchema,
      { token: memTk },
    );
    expect(page.data.items.length).toBeGreaterThanOrEqual(2);
    const members = await ep(
      t,
      'GET',
      '/rooms/:id/members',
      `/rooms/${room}/members`,
      roomMembersSchema,
      { token: memTk },
    );
    expect(members.data.total).toBe(2);
    const pins = await ep(
      t,
      'GET',
      '/rooms/:id/pins',
      `/rooms/${room}/pins`,
      items(roomPinSchema),
      {
        token: memTk,
      },
    );
    expect(pins.data.items).toHaveLength(1);
    const files = await ep(
      t,
      'GET',
      '/rooms/:id/files',
      `/rooms/${room}/files`,
      items(roomFileSchema),
      { token: memTk },
    );
    expect(files.data.items.map((f) => f.name)).toEqual(['Hop-dong.pdf']);
    await ep(t, 'POST', '/rooms/:id/read', `/rooms/${room}/read`, idOnly, { token: memTk });

    const topic = chatRoomSchema.parse(
      await (
        await t.call(`/groups/${g.id}/rooms`, {
          method: 'POST',
          token: memTk,
          json: { name: 'Chủ đề hợp đồng' },
        })
      ).json(),
    );
    await ep(t, 'DELETE', '/rooms/:id', `/rooms/${topic.id}`, idOnly, { token: memTk });
  });
});
