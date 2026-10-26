import { apiErrorSchema, meSchema } from '@opchub/shared/api';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

/** V4-607 (UP-02, REQ-504): khai báo sau đăng nhập — Postgres + Redis thật, tra MST fake */
describe('khai báo sau đăng nhập (TIP-V4-607)', () => {
  let t: TestApp;
  let g1: string;
  let g2: string;

  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    g1 = (await createGroup(t)).id;
    g2 = (await createGroup(t)).id;
  });
  afterAll(async () => {
    await removeTestGroups(t);
    await t.close();
  });

  const fresh = async (accountType: 'personal' | 'business' | 'investor') => {
    const u = await createUser(t, {
      accountType,
      fee: accountType === 'investor' ? null : 'pending_payment',
    });
    return { id: u.id, token: await tokenOf(t, u) };
  };
  const put = (token: string, json: unknown) =>
    t.call('/me/declaration', { method: 'PUT', token, json });
  const meOf = async (token: string) =>
    meSchema.parse(await (await t.call('/me', { token })).json());

  it('TK mới chưa khai báo → needsDeclaration; Cá nhân lưu → vào nhóm, declared_at, gọi lại vẫn 200', async () => {
    const u = await fresh('personal');
    expect((await meOf(u.token)).needsDeclaration).toBe(true);
    const r = await put(u.token, { accountType: 'personal', persona: 'engineer', groupIds: [g1] });
    expect(r.status).toBe(200);
    expect(meSchema.parse(await r.json()).needsDeclaration).toBe(false);
    const row = await t.prisma.db.user.findUniqueOrThrow({
      where: { id: u.id },
      select: { registrationRole: true, opcIntent: true, declaredAt: true },
    });
    expect(row).toMatchObject({ registrationRole: 'engineer', opcIntent: [g1] });
    expect(row.declaredAt).not.toBeNull();
    const joined = await t.prisma.db.groupMember.findMany({
      where: { userId: u.id },
      select: { groupId: true, status: true },
    });
    expect(joined).toEqual([{ groupId: g1, status: 'member' }]);
    // Gọi lại = cập nhật; nhóm cũ giữ nguyên, nhóm mới thêm (idempotent)
    const again = await put(u.token, {
      accountType: 'personal',
      persona: 'expert',
      groupIds: [g1, g2],
    });
    expect(again.status).toBe(200);
    expect(await t.prisma.db.groupMember.count({ where: { userId: u.id, status: 'member' } })).toBe(
      2,
    );
    expect((await meOf(u.token)).needsDeclaration).toBe(false);
  });

  it('DN: lưu hồ sơ DN + tỉnh ĐKKD, MST tra thấy → verified; GET trả bản nháp', async () => {
    const u = await fresh('business');
    const r = await put(u.token, {
      accountType: 'business',
      taxCode: '0101234567',
      companyName: 'CÔNG TY TNHH GIẢI PHÁP MEDIASOFT',
      mainIndustry: '6201 – Lập trình máy vi tính',
      size: '10',
      province: 'Đà Nẵng',
      groupIds: [g2],
    });
    expect(r.status).toBe(200);
    const biz = await t.prisma.db.businessProfile.findUniqueOrThrow({
      where: { userId: u.id },
      select: { taxCode: true, province: true, size: true, verification: true },
    });
    expect(biz).toEqual({
      taxCode: '0101234567',
      province: 'Đà Nẵng',
      size: '10',
      verification: 'verified',
    });
    const draft = await (await t.call('/me/declaration', { token: u.token })).json();
    expect(draft).toMatchObject({ groupIds: [g2], business: { province: 'Đà Nẵng' } });
  });

  it('DN: MST không tra được vẫn lưu (D-40) → pending', async () => {
    const u = await fresh('business');
    const r = await put(u.token, {
      accountType: 'business',
      taxCode: '0109999000',
      companyName: 'Công ty Nhập Tay',
      mainIndustry: 'Bán lẻ',
      size: '1',
      province: 'Hà Nội',
      groupIds: [g1],
    });
    expect(r.status).toBe(200);
    const biz = await t.prisma.db.businessProfile.findUniqueOrThrow({
      where: { userId: u.id },
      select: { verification: true },
    });
    expect(biz.verification).toBe('pending');
  });

  it('thông điệp lỗi tại ô; không ghi gì khi lỗi', async () => {
    const u = await fresh('personal');
    const empty = await put(u.token, { accountType: 'personal', persona: '', groupIds: [] });
    expect(empty.status).toBe(400);
    const messages = apiErrorSchema.parse(await empty.json()).error.fields?.map((f) => f.message);
    expect(messages).toEqual(
      expect.arrayContaining(['Vui lòng chọn bạn là ai', 'Vui lòng chọn OPC bạn muốn tham gia']),
    );
    const unknownGroup = await put(u.token, {
      accountType: 'personal',
      persona: 'engineer',
      groupIds: ['khong-ton-tai'],
    });
    expect(unknownGroup.status).toBe(400);
    const biz = await fresh('business');
    const badProvince = await put(biz.token, {
      accountType: 'business',
      taxCode: '0101234567',
      companyName: 'Công ty',
      mainIndustry: 'Ngành',
      size: '1',
      province: 'Tỉnh lạ',
      groupIds: [g1],
    });
    expect(badProvince.status).toBe(400);
    expect((await meOf(u.token)).needsDeclaration).toBe(true);
    expect((await meOf(biz.token)).needsDeclaration).toBe(true);
  });

  it('loại khai báo khác loại TK → 403; NĐT → 403 và không cần khai báo (D-14)', async () => {
    const p = await fresh('personal');
    const wrong = await put(p.token, {
      accountType: 'business',
      taxCode: '0101234567',
      companyName: 'X',
      mainIndustry: 'Y',
      size: '1',
      province: 'Hà Nội',
      groupIds: [g1],
    });
    expect(wrong.status).toBe(403);
    const inv = await fresh('investor');
    expect((await meOf(inv.token)).needsDeclaration).toBe(false);
    const r = await put(inv.token, {
      accountType: 'personal',
      persona: 'engineer',
      groupIds: [g1],
    });
    expect(r.status).toBe(403);
  });

  it('chưa đăng nhập → 401', async () => {
    expect(
      (await put('', { accountType: 'personal', persona: 'engineer', groupIds: [g1] })).status,
    ).toBe(401);
  });
});
