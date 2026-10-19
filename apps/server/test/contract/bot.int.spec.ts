import { pageSchema } from '@opchub/shared/api';
import {
  botActivityListSchema,
  botLogSchema,
  botSettingsSchema,
  botThreadApprovedSchema,
  botThreadListSchema,
  idResultSchema,
  personaListSchema,
  personaSchema,
  scriptListSchema,
  scriptRunSchema,
  scriptSchema,
} from '@opchub/shared/api-domains';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { addMember, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { ep } from './harness';
import { createContractGroup } from './lane-b.helpers';

/** Contract `bot` (16, FEATURE_BOTS) — schema đúng như apps/admin/src/features/bots/api.ts */
describe('Contract: bot', () => {
  let t: TestApp;
  let mod: string;
  const groupIds: string[] = [];
  const personaIds: string[] = [];
  const scriptIds: string[] = [];
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    mod = await tokenOf(t, await createUser(t, { adminPermissions: ['bots.view', 'bots.action'] }));
  });
  afterAll(async () => {
    await t.prisma.db.botScript.deleteMany({ where: { id: { in: scriptIds } } });
    await t.prisma.db.message.deleteMany({ where: { personaId: { in: personaIds } } });
    await t.prisma.db.persona.deleteMany({ where: { id: { in: personaIds } } });
    await t.prisma.db.group.deleteMany({ where: { id: { in: groupIds } } });
    await t.close();
  });

  const personaBody = (name: string) => ({
    name,
    title: 'Chủ shop',
    province: 'Hà Nội',
    tone: 'thân thiện',
    color: '#13C2C2',
  });

  it('persona + kịch bản: tạo → sửa → chạy → duyệt / bỏ → xoá', async () => {
    const g = await createContractGroup(t);
    groupIds.push(g.id);
    const member = await createUser(t, { fee: 'active' });
    await addMember(t, g.id, member.id);

    const p = await ep(t, 'POST', '/admin/personas', '/admin/personas', personaSchema, {
      token: mod,
      json: personaBody('Hợp Đồng Bot'),
    });
    personaIds.push(p.data.id);
    await ep(t, 'PATCH', '/admin/personas/:id', `/admin/personas/${p.data.id}`, personaSchema, {
      token: mod,
      json: personaBody('Hợp Đồng Bot 2'),
    });
    await ep(t, 'GET', '/admin/personas', '/admin/personas', personaListSchema, { token: mod });

    const scriptBody = {
      topic: 'Hợp đồng kịch bản',
      groupIds: [g.id],
      lines: [{ personaId: p.data.id, body: 'Xin chào cả nhóm' }],
    };
    const sc = await ep(t, 'POST', '/admin/scripts', '/admin/scripts', scriptSchema, {
      token: mod,
      json: scriptBody,
    });
    scriptIds.push(sc.data.id);
    await ep(t, 'PATCH', '/admin/scripts/:id', `/admin/scripts/${sc.data.id}`, scriptSchema, {
      token: mod,
      json: { ...scriptBody, topic: 'Hợp đồng kịch bản 2' },
    });
    await ep(t, 'GET', '/admin/scripts', '/admin/scripts', scriptListSchema, { token: mod });

    const run1 = await ep(
      t,
      'POST',
      '/admin/scripts/:id/run',
      `/admin/scripts/${sc.data.id}/run`,
      scriptRunSchema,
      { token: mod },
      202,
    );
    await ep(t, 'GET', '/admin/bot/threads', '/admin/bot/threads', botThreadListSchema, {
      token: mod,
    });
    await ep(
      t,
      'POST',
      '/admin/bot/threads/:id/approve',
      `/admin/bot/threads/${run1.data.threadId}/approve`,
      botThreadApprovedSchema,
      { token: mod },
    );
    const run2 = await t.call(`/admin/scripts/${sc.data.id}/run`, { method: 'POST', token: mod });
    const thread2 = scriptRunSchema.parse(await run2.json()).threadId;
    await ep(
      t,
      'DELETE',
      '/admin/bot/threads/:id',
      `/admin/bot/threads/${thread2}`,
      idResultSchema,
      { token: mod },
    );
    await ep(t, 'GET', '/admin/bot/activity', '/admin/bot/activity', botActivityListSchema, {
      token: mod,
    });
    await ep(
      t,
      'GET',
      '/admin/bot/log',
      '/admin/bot/log?page=1&size=10',
      pageSchema(botLogSchema),
      { token: mod },
    );

    await ep(t, 'DELETE', '/admin/scripts/:id', `/admin/scripts/${sc.data.id}`, idResultSchema, {
      token: mod,
    });
    await ep(t, 'DELETE', '/admin/personas/:id', `/admin/personas/${p.data.id}`, idResultSchema, {
      token: mod,
    });
  });

  it('cài đặt bot: đọc → PATCH → khôi phục', async () => {
    const cur = await ep(
      t,
      'GET',
      '/admin/bot/settings',
      '/admin/bot/settings',
      botSettingsSchema,
      {
        token: mod,
      },
    );
    const delay = cur.data.delayMinutes === 7 ? 8 : 7;
    try {
      await ep(t, 'PATCH', '/admin/bot/settings', '/admin/bot/settings', botSettingsSchema, {
        token: mod,
        json: { delayMinutes: delay },
      });
    } finally {
      await t.call('/admin/bot/settings', {
        method: 'PATCH',
        token: mod,
        json: { delayMinutes: cur.data.delayMinutes },
      });
    }
  });
});
