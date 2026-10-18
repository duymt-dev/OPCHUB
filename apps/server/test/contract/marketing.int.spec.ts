import { pageSchema } from '@opchub/shared/api';
import {
  campaignEstimateSchema,
  campaignListSchema,
  campaignSchema,
  mailJobSchema,
  mailLogRowSchema,
  mailTemplateListSchema,
  marketingSummarySchema,
  unsubscribeInfoSchema,
  unsubscribeResultSchema,
} from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { UnsubscribeToken } from '@/modules/mail';
import { addMember, createGroup, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { ep } from './harness';

const PREFIX = `CD hợp đồng ${randomUUID().slice(0, 8)}`;

/**
 * Contract `marketing` (12) — schema đúng như apps/admin/src/features/marketing/api.ts.
 * Chiến dịch gửi chỉ nhắm một nhóm test chứa user test (không bao giờ gửi tới user seed).
 */
describe('Contract: marketing', () => {
  let t: TestApp;
  let editor: string;
  let group: { id: string };
  const emails: string[] = [];
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    editor = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    group = await createGroup(t);
    for (let i = 0; i < 2; i += 1) {
      const u = await createUser(t);
      emails.push(u.email);
      await addMember(t, group.id, u.id);
    }
  });
  afterAll(async () => {
    const ids = (
      await t.prisma.db.campaign.findMany({
        where: { name: { startsWith: PREFIX } },
        select: { id: true },
      })
    ).map((c) => c.id);
    await t.prisma.db.mailLog.deleteMany({
      where: { OR: [{ campaignId: { in: ids } }, { to: { in: emails } }] },
    });
    await t.prisma.db.campaign.deleteMany({ where: { id: { in: ids } } });
    await t.prisma.db.mailSuppression.deleteMany({ where: { email: { in: emails } } });
    await t.prisma.db.group.deleteMany({ where: { id: group.id } });
    await t.close();
  });

  const draft = (name: string) => ({
    name: `${PREFIX} ${name}`,
    subject: 'Thư hợp đồng',
    body: '<p>Xin chào</p>',
    audience: 'groups' as const,
    groupIds: [group.id],
    mode: 'draft' as const,
  });

  it('chiến dịch: ước tính, mẫu, tạo nháp, danh sách, gửi, xoá', async () => {
    const est = await ep(
      t,
      'GET',
      '/admin/campaigns/estimate',
      `/admin/campaigns/estimate?audience=groups&groupIds=${group.id}`,
      campaignEstimateSchema,
      { token: editor },
    );
    expect(est.data.recipients).toBe(2);
    await ep(
      t,
      'GET',
      '/admin/campaigns/templates',
      '/admin/campaigns/templates',
      mailTemplateListSchema,
      { token: editor },
    );
    const toSend = await ep(t, 'POST', '/admin/campaigns', '/admin/campaigns', campaignSchema, {
      token: editor,
      json: draft('gửi'),
    });
    const toDelete = await ep(t, 'POST', '/admin/campaigns', '/admin/campaigns', campaignSchema, {
      token: editor,
      json: draft('xoá'),
    });
    const list = await ep(t, 'GET', '/admin/campaigns', '/admin/campaigns', campaignListSchema, {
      token: editor,
    });
    expect(list.data.items.some((c) => c.id === toSend.data.id)).toBe(true);
    const job = await ep(
      t,
      'POST',
      '/admin/campaigns/:id/send',
      `/admin/campaigns/${toSend.data.id}/send`,
      mailJobSchema,
      { token: editor },
    );
    expect(job.data.recipients).toBe(2);
    await ep(
      t,
      'DELETE',
      '/admin/campaigns/:id',
      `/admin/campaigns/${toDelete.data.id}`,
      z.object({ id: z.string() }),
      { token: editor },
    );
  });

  it('BUG-036 dừng chiến dịch + huỷ nhận công khai', async () => {
    const c = await ep(
      t,
      'POST',
      '/admin/campaigns',
      '/admin/campaigns',
      campaignSchema,
      {
        token: editor,
        json: { ...draft('dừng'), mode: 'send' },
      },
      202,
    );
    const stopped = await ep(
      t,
      'POST',
      '/admin/campaigns/:id/cancel',
      `/admin/campaigns/${c.data.id}/cancel`,
      campaignSchema,
      { token: editor },
    );
    expect(stopped.data.status).toBe('cancelled');
    const token = t.app.get(UnsubscribeToken).sign(emails[1] ?? '');
    const info = await ep(
      t,
      'GET',
      '/public/unsubscribe',
      `/public/unsubscribe?token=${token}`,
      unsubscribeInfoSchema,
    );
    expect(info.data.email).toContain('***@test.opchub.vn');
    const done = await ep(
      t,
      'POST',
      '/public/unsubscribe',
      '/public/unsubscribe',
      unsubscribeResultSchema,
      { json: { token } },
    );
    expect(done.data.unsubscribed).toBe(true);
  });

  it('nhật ký thư + gửi lại + tóm tắt', async () => {
    const to = emails[0] ?? '';
    const sent = await t.prisma.db.mailLog.create({
      data: { to, kind: 'welcome', subject: 'Chào mừng', status: 'sent', sentAt: new Date() },
    });
    const page = await ep(
      t,
      'GET',
      '/admin/mail/log',
      '/admin/mail/log?page=1&size=100',
      pageSchema(mailLogRowSchema),
      { token: editor },
    );
    expect(page.data.items.some((i) => i.id === sent.id)).toBe(true);
    await ep(
      t,
      'POST',
      '/admin/mail/log/:id/resend',
      `/admin/mail/log/${sent.id}/resend`,
      mailJobSchema,
      { token: editor },
    );
    await ep(
      t,
      'GET',
      '/admin/marketing/summary',
      '/admin/marketing/summary',
      marketingSummarySchema,
      { token: editor },
    );
  });
});
