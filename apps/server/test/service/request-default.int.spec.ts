import { randomUUID } from 'node:crypto';
import { serviceRequestSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

/** TIP-V42-708 FX-02 (§29): phiếu tư vấn không chọn dịch vụ / dịch vụ đã tắt → dịch vụ bật đầu tiên */
describe('Phiếu tư vấn — dịch vụ mặc định (FX-02)', () => {
  let t: TestApp;
  const off = `sv-off-${randomUUID().slice(0, 6)}`;
  const codes: string[] = [];
  beforeAll(async () => {
    t = await createTestApp();
    await t.prisma.db.service.create({
      data: { id: off, name: 'Dịch vụ tắt thử', model: 'Theo giờ', sort: 0, enabled: false },
    });
  });
  beforeEach(() => flushAuthState(t));
  afterAll(async () => {
    await t.prisma.db.serviceRequest.deleteMany({ where: { code: { in: codes } } });
    await t.prisma.db.service.deleteMany({ where: { id: off } });
    await t.close();
  });

  const body = {
    requesterType: 'personal',
    fullName: 'Trần Thử',
    phone: '0901234567',
    email: 'fx02@vd.vn',
    address: 'Hà Nội',
    note: '<p>Cần tư vấn</p>',
    details: { 'Nghề nghiệp / vai trò': 'Kế toán' },
  };

  it('serviceId rỗng / thiếu / đã tắt → dịch vụ bật đầu tiên theo thứ tự hiển thị', async () => {
    const first = await t.prisma.db.service.findFirst({
      where: { enabled: true },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true },
    });
    if (!first) throw new Error('seed thiếu dịch vụ bật');
    const token = await tokenOf(t, await createUser(t));
    for (const extra of [{ serviceId: '' }, {}, { serviceId: off }]) {
      const res = await t.call('/service-requests', {
        method: 'POST',
        token,
        json: { ...body, ...extra },
        headers: { 'Idempotency-Key': randomUUID() },
      });
      expect(res.status).toBe(201);
      const r = serviceRequestSchema.parse(await res.json());
      codes.push(r.code);
      expect(r).toMatchObject({ serviceId: first.id, serviceName: first.name });
    }
  });
});
