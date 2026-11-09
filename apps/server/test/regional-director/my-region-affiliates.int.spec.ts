import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  encodeMyRegionAffiliateCursor,
  myRegionAffiliatePageSchema,
  myRegionSchema,
} from '@opchub/shared/api-domains';
import { RegionalDirectorService } from '@/modules/regional-director';
import { regionalShareFixture } from '../factories/regional-share.factory';
import { tokenOf } from '../factories/group.factory';
import { flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('TIP-V46-821 B10 regional affiliate paging and private audited CSV', () => {
  let t: TestApp, f: Awaited<ReturnType<typeof regionalShareFixture>>, token: string;
  const users = Array.from({ length: 130 }, () => randomUUID()),
    prefix = randomUUID().replaceAll('-', '').slice(0, 8);
  const affiliates = users.map(() => randomUUID()),
    shares = affiliates.map(() => randomUUID());
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    f = await regionalShareFixture(t);
    await t.prisma.db.user.createMany({
      data: users.map((id, i) => ({
        id,
        memberCode: `T${prefix}${i}`,
        accountType: 'personal',
        fullName: i === 0 ? '=SUM(A1)' : `Affiliate ${String(Math.floor(i / 3)).padStart(3, '0')}`,
        email: `${prefix}-${i}@test.opchub.vn`,
      })),
    });
    await t.prisma.db.affiliate.createMany({
      data: users.map((userId, i) => ({
        id: affiliates[i] ?? '',
        userId,
        code: `A${prefix}${String(i).padStart(3, '0')}`.toUpperCase(),
        rate: 20,
      })),
    });
    await t.prisma.db.groupMember.createMany({
      data: users.map((userId) => ({ userId, groupId: f.group.id, status: 'member' })),
    });
    await t.prisma.db.regionalShare.createMany({
      data: users.map((affiliateUserId, i) => ({
        id: shares[i] ?? '',
        source: 'membership',
        sourceId: randomUUID(),
        customerId: f.customer.id,
        affiliateId: affiliates[i] ?? '',
        affiliateUserId,
        region: f.region,
        directorUserId: f.director.id,
        plan: 'personal',
        baseAmount: 100_000,
        customerYear: 1,
        percent: 1,
        directorAmount: 1000,
        mediaSoftAmount: 99_000,
        monthKey: `${2024 + Math.floor((i % 30) / 12)}-${String((i % 12) + 1).padStart(2, '0')}`,
        recordedAt: new Date('2026-10-02'),
      })),
    });
    token = await tokenOf(t, f.director);
  });
  afterAll(async () => {
    if (!t) return;
    try {
      await t.prisma.db.regionalShare.deleteMany({ where: { id: { in: shares } } });
      await t.prisma.db.user.deleteMany({ where: { id: { in: users } } });
    } finally {
      await t.close();
    }
  });
  it('SPEC16 pages50/50/30 with stable tie-breaks, no duplicates/missing, legacy first50 and months24 retained', async () => {
    const first = myRegionAffiliatePageSchema.parse(
      await (await t.call('/me/gdv/affiliates', { token })).json(),
    );
    expect(first.items).toHaveLength(50);
    expect(first.more).toBe(80);
    expect(first.nextCursor).toBeTruthy();
    const second = myRegionAffiliatePageSchema.parse(
      await (await t.call(`/me/gdv/affiliates?cursor=${first.nextCursor}`, { token })).json(),
    );
    expect(second.items).toHaveLength(50);
    expect(second.more).toBe(30);
    const third = myRegionAffiliatePageSchema.parse(
      await (await t.call(`/me/gdv/affiliates?cursor=${second.nextCursor}`, { token })).json(),
    );
    expect(third.items).toHaveLength(30);
    expect(third.more).toBe(0);
    expect(third.nextCursor).toBeNull();
    const all = [...first.items, ...second.items, ...third.items];
    expect(new Set(all.map((r) => r.id)).size).toBe(130);
    expect(new Set(all.map((r) => r.id))).toEqual(new Set(affiliates));
    expect(
      all.every(
        (r) =>
          r.province === f.group.province &&
          r.customers === 1 &&
          r.share === 1000 &&
          r.revenue === 100_000,
      ),
    ).toBe(true);
    const legacy = myRegionSchema.parse(await (await t.call('/me/gdv', { token })).json());
    expect(legacy.state).toBe('director');
    if (legacy.state !== 'director') throw new Error('Missing director');
    expect(legacy.affiliates).toEqual(first.items);
    expect(legacy.more).toBe(80);
    expect(legacy.months).toHaveLength(24);
  });
  it('SPEC17 CSV has130 rows, UTF8 BOM, safe formulas, same visible fields, no email/phone and member audit', async () => {
    const response = await t.call('/me/gdv/affiliates.csv', { token });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([239, 187, 191]);
    const csv = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);
    expect(csv.split('\n')).toHaveLength(131);
    expect(csv).toContain('"\'=SUM(A1)"');
    expect(csv).toContain(f.group.province ?? '');
    expect(csv).not.toMatch(/@test\.opchub\.vn|email|phone|SĐT/i);
    const audit = await t.prisma.db.auditLog.findFirstOrThrow({
      where: { actorId: f.director.id, action: 'regional.affiliates.export' },
    });
    expect(audit.tag).toBe('affiliate');
    expect(audit.diff).toMatchObject({ count: 130, truncated: false });
  });
  it('SPEC16 validates cursor/limit and denies non-director, locked and revoked accounts independent of claims', async () => {
    expect((await t.call('/me/gdv/affiliates?limit=51', { token })).status).toBe(400);
    expect((await t.call('/me/gdv/affiliates?cursor=broken', { token })).status).toBe(400);
    const overflow = encodeMyRegionAffiliateCursor({
      share: '9999999999999999999',
      name: '',
      id: 'fixture',
    });
    expect((await t.call(`/me/gdv/affiliates?cursor=${overflow}`, { token })).status).toBe(400);
    expect((await t.call('/me/gdv/affiliates')).status).toBe(401);
    const outsider = await tokenOf(t, f.agent);
    expect((await t.call('/me/gdv/affiliates', { token: outsider })).status).toBe(403);
    expect((await t.call('/me/gdv/affiliates.csv', { token: outsider })).status).toBe(403);
    await t.prisma.db.user.update({ where: { id: f.director.id }, data: { status: 'locked' } });
    expect((await t.call('/me/gdv/affiliates', { token })).status).toBe(403);
    expect((await t.call('/me/gdv/affiliates.csv', { token })).status).toBe(403);
    await t.prisma.db.user.update({ where: { id: f.director.id }, data: { status: 'active' } });
    await t.app.get(RegionalDirectorService).revoke(f.who, f.region);
    expect((await t.call('/me/gdv/affiliates', { token })).status).toBe(403);
    expect((await t.call('/me/gdv/affiliates.csv', { token })).status).toBe(403);
  });
});
