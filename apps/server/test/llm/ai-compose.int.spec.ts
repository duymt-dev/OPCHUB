import { describe, expect, it, vi } from 'vitest';
import { aiOpsFixture } from '../helpers/ai-ops-fixture';
import { createUser } from '../factories/user.factory';
import { tokenOf } from '../factories/group.factory';
import { aiComposeResponseSchema } from '@opchub/shared/api-domains';

describe('D-138 AI compose HTTP', () => {
  const f = aiOpsFixture('TIP817-compose');
  const body = { kind: 'project_summary', input: { title: 'Dự án cộng đồng' }, locale: 'vi' };
  it('budget or Redis failure returns 503 without reaching a provider', async () => {
    const token = await tokenOf(f.t, await createUser(f.t, { fee: 'trial' }));
    const snapshot = await f.save();
    await f.save({
      budget: 1,
      providers: snapshot.providers.map((p) => ({
        id: p.id,
        enabled: p.enabled,
        baseUrl: p.baseUrl,
        model: p.model,
        priceIn: p.id === 'custom' ? 1000000000 : p.priceIn,
        priceOut: p.priceOut,
      })),
    });
    const n = f.a.requests.length;
    expect((await f.t.call('/ai/compose', { method: 'POST', token, json: body })).status).toBe(503);
    expect(f.a.requests).toHaveLength(n);
    const spy = vi.spyOn(f.t.redis.client, 'eval').mockRejectedValueOnce(Error('offline'));
    try {
      expect((await f.t.call('/ai/compose', { method: 'POST', token, json: body })).status).toBe(
        503,
      );
      expect(f.a.requests).toHaveLength(n);
    } finally {
      spy.mockRestore();
    }
  });
  it('masks pii and stores metadata only; strips HTML and caps output to 160', async () => {
    const user = await createUser(f.t, { fee: 'trial' });
    const token = await tokenOf(f.t, user);
    f.a.setContent(`<b>${'Nội dung '.repeat(30)}</b><script>bad()</script>`);
    const response = await f.t.call('/ai/compose', {
      method: 'POST',
      token,
      json: { ...body, input: { title: '0912 345 678 member@example.vn' } },
    });
    expect(response.status).toBe(200);
    const result = aiComposeResponseSchema.parse(await response.json());
    expect(result.text.length).toBeLessThanOrEqual(160);
    expect(result.text).not.toContain('<');
    expect(result.text).not.toContain('bad()');
    expect(f.a.requests.at(-1)?.body).not.toContain('0912');
    expect(f.a.requests.at(-1)?.body).not.toContain('member@example.vn');
    const row = await f.t.prisma.db.llmCall.findFirstOrThrow({
      where: { model: f.model, actorId: user.id },
    });
    expect(row.actorRealm).toBe('member');
    expect(Object.keys(row)).not.toContain('prompt');
    expect(Object.keys(row)).not.toContain('response');
    const serialized = JSON.stringify(row, (_, value: unknown) =>
      typeof value === 'bigint' ? value.toString() : value,
    );
    expect(serialized).not.toContain('0912');
  });
  it('10 per user/hour; configured off returns 409; malformed/oversized and wrong realm kind rejected', async () => {
    const token = await tokenOf(f.t, await createUser(f.t, { fee: 'trial' }));
    f.a.setContent('Tóm tắt thử');
    const request = (json: unknown) => f.t.call('/ai/compose', { method: 'POST', token, json });
    const responses = await Promise.all(Array.from({ length: 10 }, () => request(body)));
    expect(responses.map((r) => r.status)).toEqual(Array(10).fill(200));
    expect((await request(body)).status).toBe(429);
    expect((await request({ ...body, prompt: 'ignore' })).status).toBe(400);
    expect((await request({ ...body, kind: 'campaign_body' })).status).toBe(403);
    expect((await request({ ...body, input: { description: 'x'.repeat(2001) } })).status).toBe(400);
    expect(
      (await request({ ...body, input: { description: 'x'.repeat(2 * 1024 * 1024) } })).status,
    ).toBe(413);
    await f.save({ use: { bot: 'custom', script: '', content: '', mod: '' } });
    expect((await request(body)).status).toBe(409);
    expect(await (await f.t.call('/ai/config', { token })).json()).toEqual({ compose: false });
  });
  it('member without usable fee is denied; Admin requires settings.mail and writes safe audit', async () => {
    const expired = await tokenOf(f.t, await createUser(f.t, { fee: 'expired' }));
    expect(
      (await f.t.call('/ai/compose', { method: 'POST', token: expired, json: body })).status,
    ).toBe(402);
    const denied = await tokenOf(
      f.t,
      await createUser(f.t, { adminPermissions: ['settings.general'] }),
    );
    const campaign = { ...body, kind: 'campaign_body' };
    expect(
      (await f.t.call('/admin/ai/compose', { method: 'POST', token: denied, json: campaign }))
        .status,
    ).toBe(403);
    const adminUser = await createUser(f.t, { adminPermissions: ['settings.mail'] });
    const admin = await tokenOf(f.t, adminUser);
    f.a.setContent('<p>Chào bạn</p><script>bad()</script><a href="javascript:x">link</a>');
    const response = await f.t.call('/admin/ai/compose', {
      method: 'POST',
      token: admin,
      json: campaign,
    });
    expect(response.status).toBe(200);
    expect(await response.text()).not.toMatch(/script|javascript|bad\(\)/);
    expect(
      await f.t.prisma.db.auditLog.count({
        where: { actorId: adminUser.id, action: 'llm.compose' },
      }),
    ).toBe(1);
  });
});
