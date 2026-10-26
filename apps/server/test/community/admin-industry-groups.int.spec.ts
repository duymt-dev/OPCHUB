import { groupDetailSchema } from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

/** D-89 (prototype v4): Admin tạo Nhóm ngành thuộc Nhóm tỉnh chung cùng tỉnh */
describe('Admin tạo nhóm ngành (TIP-V4-619)', () => {
  let t: TestApp;
  const created: string[] = [];

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.prisma.db.group.deleteMany({ where: { id: { in: created } } });
    await t.close();
  });
  beforeEach(async () => {
    await flushAuthState(t);
  });

  const adminToken = async () => tokenOf(t, await createUser(t, { systemRole: 'admin' }));

  it('nhóm ngành gắn nhóm tỉnh cha; thiếu ngành 400; trùng ngành / tỉnh chưa có nhóm chung 409', async () => {
    const token = await adminToken();
    const industry = `Ngành thử ${randomUUID().slice(0, 6)}`;
    const body = {
      name: `OPC Hà Nội – ${industry}`,
      province: 'Hà Nội',
      description: 'Nhóm ngành thử',
      kind: 'industry',
      industry,
    };
    const post = (json: object) => t.call('/admin/groups', { method: 'POST', token, json });

    const r = await post(body);
    expect(r.status).toBe(201);
    const d = groupDetailSchema.parse(await r.json());
    created.push(d.id);
    expect(d).toMatchObject({ kind: 'industry', industry, parentId: 'c1', region: 'Miền Bắc' });

    // Cùng tỉnh, cùng ngành (khác hoa thường) → 409; tên khác vẫn chặn
    const dup = await post({ ...body, name: `${body.name} 2`, industry: industry.toUpperCase() });
    expect(dup.status).toBe(409);

    const missing = await post({ ...body, name: `${body.name} 3`, industry: ' ' });
    expect(missing.status).toBe(400);
    const err = (await missing.json()) as { error: { fields: { path: string }[] } };
    expect(err.error.fields.map((f) => f.path)).toContain('industry');

    // Nhóm tỉnh chung vẫn chỉ một / tỉnh
    const prov = await post({ ...body, name: `OPC thử ${industry}`, kind: 'province' });
    expect(prov.status).toBe(409);

    // Sửa nhóm ngành giữ cha, đổi tên
    const patch = await t.call(`/admin/groups/${d.id}`, {
      method: 'PATCH',
      token,
      json: { ...body, name: `${body.name} mới` },
    });
    expect(groupDetailSchema.parse(await patch.json())).toMatchObject({
      name: `${body.name} mới`,
      parentId: 'c1',
    });
  });

  it('tỉnh chưa có Nhóm tỉnh chung → 409 khi tạo nhóm ngành', async () => {
    const token = await adminToken();
    const seed = await t.prisma.db.group.findUniqueOrThrow({
      where: { id: 'c34' },
      select: { province: true },
    });
    await t.prisma.db.group.update({ where: { id: 'c34' }, data: { deletedAt: new Date() } });
    try {
      const r = await t.call('/admin/groups', {
        method: 'POST',
        token,
        json: {
          name: `OPC thử ${randomUUID().slice(0, 6)}`,
          province: seed.province,
          description: 'x',
          kind: 'industry',
          industry: 'Cà phê thử',
        },
      });
      expect(r.status).toBe(409);
      expect(((await r.json()) as { error: { message: string } }).error.message).toBe(
        `Chưa có Nhóm tỉnh chung cho ${seed.province}`,
      );
    } finally {
      await t.prisma.db.group.update({ where: { id: 'c34' }, data: { deletedAt: null } });
    }
  });
});
