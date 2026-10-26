import { pageSchema } from '@opchub/shared/api';
import {
  adminInvestorSchema,
  adminInvestorSummarySchema,
  csvFileSchema,
  investorInterestSchema,
  projectDetailSchema,
} from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { tokenOf } from '../factories/group.factory';
import {
  activateFundraising,
  createProject,
  removeTestProjects,
} from '../factories/project.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const FUNDING = {
  amount: 2_000_000_000,
  currency: 'VND' as const,
  equityPercent: 10,
  minTicket: 100_000_000,
};
const body = (over: Record<string, unknown> = {}) => ({
  kind: 'fund',
  contactName: 'Nguyễn Hoàng Nam',
  organization: 'VinaCapital Ventures',
  phone: '+84 903 112 456',
  amount: 1_000_000_000,
  message: 'Quan tâm vòng Seed',
  ...over,
});

describe('Nhà đầu tư (B33)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(() => flushAuthState(t));
  afterAll(async () => {
    await removeTestProjects(t);
    await t.close();
  });

  const interest = (tk: string, id: string, key: string | null, json: unknown) =>
    t.call(`/projects/${id}/interest`, {
      method: 'POST',
      token: tk,
      json,
      headers: key ? { 'Idempotency-Key': key } : {},
    });

  it('Idempotency-Key: thiếu → 400; cùng key → cùng bản ghi; key khác → 409 (BR-09)', async () => {
    const owner = await tokenOf(t, await createUser(t, { fee: 'active' }));
    const p = await createProject(t, owner, { funding: FUNDING });
    // V4-610 (UP-11): chỉ nhận quan tâm khi Gói Gọi vốn đang hiệu lực
    await activateFundraising(t, p.id);
    const inv = await tokenOf(t, await createUser(t, { accountType: 'investor' }));
    expect((await interest(inv, p.id, null, body())).status).toBe(400);
    const key = randomUUID();
    const a = await interest(inv, p.id, key, body());
    expect(a.status).toBe(201);
    const first = investorInterestSchema.parse(await a.json());
    expect(first).toMatchObject({ currency: 'VND', amount: 1_000_000_000 });
    expect(first).not.toHaveProperty('status');
    const again = investorInterestSchema.parse(
      await (await interest(inv, p.id, key, body())).json(),
    );
    expect(again.id).toBe(first.id);
    expect((await interest(inv, p.id, randomUUID(), body())).status).toBe(409);
    expect(await t.prisma.db.investorInterest.count({ where: { projectId: p.id } })).toBe(1);

    const d = projectDetailSchema.parse(
      await (await t.call(`/projects/${p.id}`, { token: inv })).json(),
    );
    expect(d.myInterest).toMatchObject({ amount: 1_000_000_000 });
    expect(d.interestCount).toBe(1);
    expect(d.pledged).toBe(1_000_000_000);
  });

  it('chủ dự án → 403; dưới mức tối thiểu → 409; không gọi vốn → 404; DN thiếu đơn vị → 400', async () => {
    const ownerU = await createUser(t, { fee: 'active' });
    const owner = await tokenOf(t, ownerU);
    const p = await createProject(t, owner, { funding: FUNDING });
    // V4-610 (UP-11): chỉ nhận quan tâm khi Gói Gọi vốn đang hiệu lực
    await activateFundraising(t, p.id);
    const noFund = await createProject(t, owner);
    expect((await interest(owner, p.id, randomUUID(), body())).status).toBe(403);
    const inv = await tokenOf(t, await createUser(t, { fee: 'active' }));
    const low = await interest(inv, p.id, randomUUID(), body({ amount: 10_000_000 }));
    expect(low.status).toBe(409);
    expect((await interest(inv, noFund.id, randomUUID(), body())).status).toBe(404);
    expect(
      (await interest(inv, p.id, randomUUID(), body({ kind: 'business', organization: '' })))
        .status,
    ).toBe(400);
  });

  it('REQ-372 V2Q-62 chủ dự án xem danh sách NĐT nhưng không gửi vào luồng NĐT; người ngoài 404', async () => {
    const owner = await tokenOf(t, await createUser(t, { fee: 'active' }));
    const p = await createProject(t, owner, { funding: FUNDING });
    // V4-610 (UP-11): chỉ nhận quan tâm khi Gói Gọi vốn đang hiệu lực
    await activateFundraising(t, p.id);
    const inv = await tokenOf(t, await createUser(t, { accountType: 'investor' }));
    const i = investorInterestSchema.parse(
      await (await interest(inv, p.id, randomUUID(), body())).json(),
    );

    expect((await t.call(`/projects/${p.id}/interests`, { token: inv })).status).toBe(403);
    const list = (await (await t.call(`/projects/${p.id}/interests`, { token: owner })).json()) as {
      items: unknown[];
    };
    expect(list.items).toHaveLength(1);

    // D-72: luồng trao đổi nhà đầu tư đã bỏ — route cũ không còn
    const gone = await t.call(`/investor-thread/${i.id}/messages`, {
      method: 'POST',
      token: inv,
      json: { body: 'Chào anh' },
    });
    expect(gone.status).toBe(404);
    expect((await t.call('/me/investor-thread', { token: inv })).status).toBe(404);
    expect(i).not.toHaveProperty('status');
  });

  it('Admin: gom theo người, danh sách + xuất CSV + audit (D-72 không trạng thái/trao đổi)', async () => {
    const admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    const owner = await tokenOf(t, await createUser(t, { fee: 'active' }));
    const p1 = await createProject(t, owner, { funding: FUNDING });
    // V4-610 (UP-11): chỉ nhận quan tâm khi Gói Gọi vốn đang hiệu lực
    await activateFundraising(t, p1.id);
    const p2 = await createProject(t, owner, { funding: FUNDING });
    // V4-610 (UP-11): chỉ nhận quan tâm khi Gói Gọi vốn đang hiệu lực
    await activateFundraising(t, p2.id);
    const invU = await createUser(t, { accountType: 'investor' });
    const inv = await tokenOf(t, invU);
    const first = investorInterestSchema.parse(
      await (await interest(inv, p1.id, randomUUID(), body())).json(),
    );
    await interest(inv, p2.id, randomUUID(), body({ amount: 500_000_000 }));

    const page = pageSchema(adminInvestorSchema).parse(
      await (await t.call('/admin/investors?kind=fund&size=100', { token: admin })).json(),
    );
    const row = page.items.find((r) => r.key === first.id);
    expect(row).toMatchObject({ totalAmount: 1_500_000_000 });
    expect(row).not.toHaveProperty('status');
    expect(row).not.toHaveProperty('commentCount');
    expect(row?.items).toHaveLength(2);

    const c = await t.call(`/admin/investors/${first.id}/comments`, {
      method: 'POST',
      token: admin,
      json: { body: 'Đã gọi điện' },
    });
    expect(c.status).toBe(404);
    const st = await t.call(`/admin/investors/${first.id}/status`, {
      method: 'PATCH',
      token: admin,
      json: { status: 'connected' },
    });
    expect(st.status).toBe(404);

    const sum = adminInvestorSummarySchema.parse(
      await (await t.call('/admin/investors/summary', { token: admin })).json(),
    );
    expect(sum.fund).toBeGreaterThan(0);
    const exp = csvFileSchema.parse(
      await (
        await t.call('/admin/investors/export', {
          method: 'POST',
          token: admin,
          json: { kind: 'fund' },
        })
      ).json(),
    );
    expect(exp.filename).toBe('nha-dau-tu.csv');
    expect(exp.csv).toContain('"Quỹ đầu tư"');
    const actions = await t.prisma.db.auditLog.findMany({
      where: { action: { startsWith: 'investor.' }, entityId: { in: [invU.id, 'investors'] } },
      select: { action: true },
    });
    expect(new Set(actions.map((a) => a.action))).toEqual(new Set(['investor.export']));
    const q = pageSchema(adminInvestorSchema).parse(
      await (
        await t.call(`/admin/investors?q=${encodeURIComponent('VinaCapital')}`, { token: admin })
      ).json(),
    );
    expect(q.total).toBeGreaterThan(0);
  });
});

describe('D-72 nhà đầu tư chỉ còn danh sách', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.close();
  });

  it('DB không còn cột trạng thái, bảng trao đổi, enum trạng thái', async () => {
    const cols = await t.prisma.db.$queryRaw<{ table_name: string }[]>`
      SELECT table_name::text FROM information_schema.columns
      WHERE table_schema = current_schema() AND column_name = 'status'
        AND table_name IN ('investor_interests', 'investor_summaries')`;
    expect(cols).toEqual([]);
    const tables = await t.prisma.db.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = 'investor_comments'`;
    expect(tables[0]?.n).toBe(0);
    const types = await t.prisma.db.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM pg_type WHERE typname = 'investor_interest_status'`;
    expect(types[0]?.n).toBe(0);
  });
});
