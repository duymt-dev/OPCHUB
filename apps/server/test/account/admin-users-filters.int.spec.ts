import { adminMemberPageSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addMember, createGroup, removeTestGroups } from '../factories/group.factory';
import { createUser, flushAuthState, loginOf, tokenBodySchema } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

/** TIP-V4-623 (D-89): thanh lọc Thành viên v4 — Nhóm, Vai trò, Phí, Trạng thái, Hồ sơ, Ngày đăng ký */
describe('Admin Thành viên · thanh lọc v4', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await removeTestGroups(t);
    await t.close();
  });
  beforeEach(async () => {
    await flushAuthState(t);
  });

  const ids = async (token: string, qs: string) => {
    const res = await t.call(`/admin/users?page=1&size=100&${qs}`, { token });
    expect(res.status).toBe(200);
    return adminMemberPageSchema.parse(await res.json()).items.map((m) => m.id);
  };

  it('mỗi bộ lọc trả đúng tập thành viên, kết hợp được với nhau', async () => {
    const admin = await createUser(t, { systemRole: 'admin' });
    const token = tokenBodySchema.parse(await (await loginOf(t, admin)).json()).accessToken;
    const group = await createGroup(t);
    const paid = await createUser(t, { fee: 'active' });
    const unpaid = await createUser(t, { fee: 'pending_payment' });
    const locked = await createUser(t, { fee: 'expired', status: 'locked' });
    await addMember(t, group.id, paid.id);
    await addMember(t, group.id, unpaid.id);
    await addMember(t, group.id, locked.id);
    await t.prisma.db.user.update({
      where: { id: paid.id },
      data: { registrationRole: 'expert', declaredAt: new Date() },
    });
    await t.prisma.db.user.update({
      where: { id: unpaid.id },
      data: { registrationRole: 'student', declaredAt: null },
    });
    // Đăng ký 200 ngày trước: ngoài "90 ngày qua"
    await t.prisma.db.user.update({
      where: { id: locked.id },
      data: { declaredAt: new Date(), createdAt: new Date(Date.now() - 200 * 86_400_000) },
    });
    const g = `group=${group.id}`;

    expect((await ids(token, g)).sort()).toEqual([paid.id, unpaid.id, locked.id].sort());
    expect(await ids(token, `${g}&role=expert`)).toEqual([paid.id]);
    expect(await ids(token, `${g}&fee=paid`)).toEqual([paid.id]);
    expect((await ids(token, `${g}&fee=unpaid`)).sort()).toEqual([unpaid.id, locked.id].sort());
    expect(await ids(token, `${g}&status=locked`)).toEqual([locked.id]);
    expect(await ids(token, `${g}&profile=inc`)).toEqual([unpaid.id]);
    expect((await ids(token, `${g}&days=90`)).sort()).toEqual([paid.id, unpaid.id].sort());
    expect(await ids(token, `${g}&fee=paid&status=locked`)).toEqual([]);
    // Giá trị rác → bỏ qua bộ lọc đó (schema `.catch`), không 400
    expect((await ids(token, `${g}&days=5&fee=x`)).length).toBe(3);
  });

  it('D-107 lọc phí: Đã đóng phí · Miễn phí 3 tháng · Chưa đóng / Hết hạn (trial không thuộc hai nhóm kia)', async () => {
    const admin = await createUser(t, { systemRole: 'admin' });
    const token = tokenBodySchema.parse(await (await loginOf(t, admin)).json()).accessToken;
    const group = await createGroup(t);
    const trial = await createUser(t, { fee: 'trial' });
    const soon = await createUser(t, { fee: 'expiring' });
    const expired = await createUser(t, { fee: 'expired' });
    const noFee = await createUser(t, { fee: null });
    for (const u of [trial, soon, expired, noFee]) await addMember(t, group.id, u.id);
    const g = `group=${group.id}`;
    expect(await ids(token, `${g}&fee=trial`)).toEqual([trial.id]);
    expect(await ids(token, `${g}&fee=paid`)).toEqual([soon.id]);
    expect((await ids(token, `${g}&fee=unpaid`)).sort()).toEqual([expired.id, noFee.id].sort());
  });

  it('D-90 sắp theo mã TV tăng dần (như prototype v4), không theo ngày đăng ký', async () => {
    const admin = await createUser(t, { systemRole: 'admin' });
    const token = tokenBodySchema.parse(await (await loginOf(t, admin)).json()).accessToken;
    const group = await createGroup(t);
    const [a, b, c] = [await createUser(t), await createUser(t), await createUser(t)];
    for (const u of [a, b, c]) await addMember(t, group.id, u.id);
    const tag = Date.now().toString(36);
    // Mã tăng dần a < b < c nhưng ngày đăng ký ngược lại (a mới nhất)
    const set = (id: string, code: string, daysAgo: number) =>
      t.prisma.db.user.update({
        where: { id },
        data: {
          memberCode: `TV${tag}${code}`,
          createdAt: new Date(Date.now() - daysAgo * 86_400_000),
        },
      });
    await set(a.id, '1', 1);
    await set(b.id, '2', 5);
    await set(c.id, '3', 9);
    expect(await ids(token, `group=${group.id}`)).toEqual([a.id, b.id, c.id]);
    // Phân trang giữ cùng thứ tự
    const page2 = adminMemberPageSchema.parse(
      await (await t.call(`/admin/users?group=${group.id}&page=2&size=2`, { token })).json(),
    );
    expect(page2.items.map((m) => m.id)).toEqual([c.id]);
  });
});
