import { adminPriceConfigSchema, priceConfigSchema, type PriceConfig } from '@opchub/shared';
import { apiErrorSchema } from '@opchub/shared/api';
import { fundraisingPaymentSchema } from '@opchub/shared/api-domains';
import { PRICE_DEFAULTS } from '@opchub/shared/fixtures';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PriceConfigService } from '@/modules/pricing';
import { tokenOf } from '../factories/group.factory';
import { createProject, removeTestProjects } from '../factories/project.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const FUNDING = { amount: 2_000_000_000, currency: 'VND' as const, equityPercent: 10 };
const NEXT: PriceConfig = {
  per: { list: 250_000, y: 1_500_000 },
  biz: { list: 600_000, y: 4_200_000 },
  fund: { p: 18_000_000, r: 9_000_000, mo: 3 },
};

/** TIP-V42-703 (D-94 5A, REQ-603): Cấu hình bảng giá — đọc qua cache, lưu + lịch sử + audit */
describe('Cấu hình bảng giá (TIP-V42-703)', () => {
  let t: TestApp;
  let admin: string;
  const get = () => t.call('/admin/price-config', { token: admin });
  const put = (body: unknown, token = admin) =>
    t.call('/admin/price-config', { method: 'PUT', token, json: body });
  const current = async () => adminPriceConfigSchema.parse(await (await get()).json());
  /** Khôi phục giá mặc định sau mỗi test (giá test khác giữ đúng PRICE_DEFAULTS) */
  const restore = async () => {
    const c = await current();
    if (JSON.stringify(priceConfigSchema.parse(c)) === JSON.stringify(PRICE_DEFAULTS)) return;
    expect((await put({ ...PRICE_DEFAULTS, version: c.version })).status).toBe(200);
  };

  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'super_admin' }));
    await restore();
  });
  beforeEach(() => flushAuthState(t));
  afterAll(async () => {
    await restore();
    await removeTestProjects(t);
    await t.close();
  });

  it('AC1: giá mặc định §27.2 sau migrate; Portal đọc công khai không cần đăng nhập', async () => {
    expect(priceConfigSchema.parse(await current())).toEqual(PRICE_DEFAULTS);
    const pub = await t.call('/public/price-config');
    expect(pub.status).toBe(200);
    expect(pub.headers.get('cache-control')).toBe('no-store');
    expect(priceConfigSchema.parse(await pub.json())).toEqual(PRICE_DEFAULTS);
  });

  it('AC2: lưu → version+1, lịch sử, audit diff; Portal thấy giá mới ngay (xoá cache)', async () => {
    // Đọc trước để cache Redis có giá cũ
    await t.call('/public/price-config');
    const before = await current();
    const hist = await t.prisma.db.priceConfigHistory.count();
    const res = await put({ ...NEXT, version: before.version });
    expect(res.status).toBe(200);
    const saved = adminPriceConfigSchema.parse(await res.json());
    expect(saved.version).toBe(before.version + 1);
    expect(priceConfigSchema.parse(saved)).toEqual(NEXT);
    expect(await t.prisma.db.priceConfigHistory.count()).toBe(hist + 1);
    const last = await t.prisma.db.priceConfigHistory.findFirstOrThrow({
      orderBy: { changedAt: 'desc' },
    });
    expect(last).toMatchObject({ version: saved.version, perYear: 1_500_000, fundMonths: 3 });
    const audit = await t.prisma.db.auditLog.findFirstOrThrow({
      where: { action: 'pricing.update', entity: 'price_config' },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toMatchObject({ tag: 'pricing', summary: 'Cập nhật bảng giá' });
    expect(audit.diff).toMatchObject({ before: PRICE_DEFAULTS, after: NEXT });
    const pub = priceConfigSchema.parse(await (await t.call('/public/price-config')).json());
    expect(pub).toEqual(NEXT);
    expect(await t.app.get(PriceConfigService).current()).toEqual(NEXT);
    // Lịch sử chỉ thêm (trigger)
    await expect(
      t.prisma.db.priceConfigHistory.delete({ where: { id: last.id } }),
    ).rejects.toThrow();
    await restore();
  });

  it('AC3: thiếu settings.general → 403; giá bán 0 / thời hạn 0 → 400; version cũ → 409', async () => {
    const c = await current();
    const viewer = await tokenOf(t, await createUser(t, { adminPermissions: ['settings.log'] }));
    expect((await put({ ...NEXT, version: c.version }, viewer)).status).toBe(403);
    const zero = await put({ ...PRICE_DEFAULTS, per: { list: 1, y: 0 }, version: c.version });
    expect(zero.status).toBe(400);
    expect(JSON.stringify(await zero.json())).toContain('Giá bán không được để trống');
    const mo = await put({
      ...PRICE_DEFAULTS,
      fund: { ...PRICE_DEFAULTS.fund, mo: 0 },
      version: c.version,
    });
    expect(mo.status).toBe(400);
    expect(JSON.stringify(await mo.json())).toContain('Thời hạn gói Gọi vốn tối thiểu 1 tháng');
    const stale = await put({ ...NEXT, version: c.version - 1 });
    expect(stale.status).toBe(409);
    expect(apiErrorSchema.parse(await stale.json()).error.code).toBe('CONFLICT');
    expect(await current()).toMatchObject({ version: c.version });
  });

  it('AC4: TK mới theo giá mới; khoản chưa thu đổi giá; kỳ đã thu giữ nguyên', async () => {
    const trial = await createUser(t, { fee: 'trial', accountType: 'business' });
    const paid = await createUser(t, { fee: 'active' });
    const c = await current();
    expect((await put({ ...NEXT, version: c.version })).status).toBe(200);
    const fee = (id: string) =>
      t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId: id } });
    expect((await fee(trial.id)).amount).toBe(NEXT.biz.y);
    // Kỳ kế tiếp của TK đã đóng cũng theo giá mới; kỳ đã thu (periods) không đổi
    expect((await fee(paid.id)).amount).toBe(NEXT.per.y);
    // Đăng ký mới sau khi đổi giá → trial với giá Cá nhân mới (fee-writer đọc cấu hình)
    const email = `price-${Date.now().toString(36)}@test.opchub.vn`;
    const reg = await t.call('/auth/register/personal', {
      method: 'POST',
      json: {
        fullName: 'Người Dùng Giá Mới',
        phone: { country: 'vn', number: '' },
        email,
        password: 'Opchub@2026',
        agreeTerms: true,
      },
    });
    expect(reg.status).toBe(202);
    const otp = await t.call('/auth/otp/verify', {
      method: 'POST',
      json: { email, code: '123456' },
    });
    expect(otp.status).toBe(200);
    const fresh = await t.prisma.db.user.findUniqueOrThrow({ where: { email } });
    expect(await fee(fresh.id)).toMatchObject({ status: 'trial', amount: NEXT.per.y });
    const periods = await t.prisma.db.membershipFeePeriod.findMany({ where: { userId: paid.id } });
    expect(periods.every((x) => x.amount !== NEXT.per.y)).toBe(true);
    await restore();
  });

  it('AC5: Gọi vốn mới theo fund.p, thời hạn duyệt theo fund.mo; khoản đang mở giữ nguyên', async () => {
    const owner = await createUser(t, { fee: 'active' });
    const token = await tokenOf(t, owner);
    const p = await createProject(t, token, { funding: FUNDING });
    const opened = fundraisingPaymentSchema.parse(
      await (await t.call(`/projects/${p.id}/fundraising`, { method: 'POST', token })).json(),
    );
    expect(opened.amount).toBe(PRICE_DEFAULTS.fund.p);
    const c = await current();
    expect((await put({ ...NEXT, version: c.version })).status).toBe(200);
    const again = fundraisingPaymentSchema.parse(
      await (await t.call(`/projects/${p.id}/fundraising`, { method: 'POST', token })).json(),
    );
    expect(again).toMatchObject({ id: opened.id, amount: PRICE_DEFAULTS.fund.p });
    const p2 = await createProject(t, token, { funding: FUNDING });
    const fresh = fundraisingPaymentSchema.parse(
      await (await t.call(`/projects/${p2.id}/fundraising`, { method: 'POST', token })).json(),
    );
    expect(fresh.amount).toBe(NEXT.fund.p);
    // Duyệt → thời hạn `fund.mo` tháng của cấu hình hiện hành
    await t.prisma.db.projectFundraising.update({
      where: { id: fresh.id },
      data: { status: 'pending_review', paidAt: new Date() },
    });
    const ok = await t.call(`/admin/projects/${p2.id}/fundraising/${fresh.id}/review`, {
      method: 'POST',
      token: admin,
      json: { decision: 'approve' },
    });
    expect(ok.status).toBe(204);
    const row = await t.prisma.db.projectFundraising.findUniqueOrThrow({ where: { id: fresh.id } });
    const end = new Date(row.startsAt ?? 0);
    end.setUTCMonth(end.getUTCMonth() + NEXT.fund.mo);
    expect(row.endsAt?.toISOString()).toBe(end.toISOString());
    await restore();
  });
});
