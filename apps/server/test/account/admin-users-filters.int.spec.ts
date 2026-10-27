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
});
