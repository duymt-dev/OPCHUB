import { pageSchema } from '@opchub/shared/api';
import { chatMessageSchema, keywordListSchema, reportSchema } from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addMember, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { ep } from './harness';
import { createContractGroup } from './lane-b.helpers';

/** Contract `moderation` (6) — schema đúng như apps/admin/src/features/groups/api.ts */
describe('Contract: moderation', () => {
  let t: TestApp;
  let admin: string;
  const groupIds: string[] = [];
  const word = `hopdong${randomUUID().slice(0, 8)}`;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
  });
  afterAll(async () => {
    await t.prisma.db.moderationKeyword.deleteMany({ where: { word } });
    await t.prisma.db.group.deleteMany({ where: { id: { in: groupIds } } });
    await t.close();
  });

  it('báo cáo tin → danh sách → chi tiết → xử lý', async () => {
    const g = await createContractGroup(t);
    groupIds.push(g.id);
    const [sender, reporter] = await Promise.all([
      createUser(t, { fee: 'active' }),
      createUser(t, { fee: 'active' }),
    ]);
    for (const u of [sender, reporter]) await addMember(t, g.id, u.id);
    const msg = chatMessageSchema.parse(
      await (
        await t.call(`/rooms/${g.id}-general/messages`, {
          method: 'POST',
          token: await tokenOf(t, sender),
          json: { clientMsgId: randomUUID(), body: 'Tin cần kiểm duyệt' },
        })
      ).json(),
    );
    const rep = reportSchema.parse(
      await (
        await t.call(`/messages/${msg.id}/report`, {
          method: 'POST',
          token: await tokenOf(t, reporter),
          json: { reason: 'spam' },
        })
      ).json(),
    );

    await ep(
      t,
      'GET',
      '/admin/reports',
      '/admin/reports?status=open&page=1&size=100',
      pageSchema(reportSchema),
      { token: admin },
    );
    const one = await ep(
      t,
      'GET',
      '/admin/reports/:id/action',
      `/admin/reports/${encodeURIComponent(rep.id)}/action`,
      reportSchema,
      { token: admin },
    );
    expect(one.data.id).toBe(rep.id);
    const done = await ep(
      t,
      'POST',
      '/admin/reports/:id/action',
      `/admin/reports/${encodeURIComponent(rep.id)}/action`,
      reportSchema,
      { token: admin, json: { action: 'dismiss' } },
    );
    expect(done.data.status).toBe('resolved');
  });

  it('từ khoá: thêm → danh sách → xoá', async () => {
    const added = await ep(
      t,
      'POST',
      '/admin/moderation/keywords',
      '/admin/moderation/keywords',
      keywordListSchema,
      { token: admin, json: { word } },
      201,
    );
    expect(added.data.items).toContain(word);
    await ep(
      t,
      'GET',
      '/admin/moderation/keywords',
      '/admin/moderation/keywords',
      keywordListSchema,
      { token: admin },
    );
    const left = await ep(
      t,
      'DELETE',
      '/admin/moderation/keywords/:word',
      `/admin/moderation/keywords/${encodeURIComponent(word)}`,
      keywordListSchema,
      { token: admin },
    );
    expect(left.data.items).not.toContain(word);
  });
});
