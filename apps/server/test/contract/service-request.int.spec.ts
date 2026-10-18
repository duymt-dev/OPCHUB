import { pageSchema } from '@opchub/shared/api';
import {
  adminServiceCommentSchema,
  adminServiceSchema,
  csvFileSchema,
  serviceRequestSchema,
  serviceRequestSummarySchema,
  serviceSchema,
  staffMemberSchema,
} from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { ep } from './harness';

const items = <T extends z.ZodType>(s: T) => z.object({ items: z.array(s) });
const idSchema = z.object({ id: z.string() });

/**
 * Contract `service-request` (15, FEATURE_SERVICES bật ở .env test) — schema đúng như
 * apps/admin/src/features/requests/api.ts và apps/portal/src/features/services/api.ts.
 * `PATCH /admin/service-requests/:code` FE chưa gọi → schema controller (`serviceRequestSchema`).
 */
describe('Contract: service-request', () => {
  let t: TestApp;
  let admin: string;
  let member: string;
  const svcId = `sv-ctr-${randomUUID().slice(0, 8)}`;
  const svcName = `Dịch vụ hợp đồng ${svcId}`;
  const codes: string[] = [];
  const createdSvc: string[] = [];
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    member = await tokenOf(t, await createUser(t, { fee: 'active' }));
    await t.prisma.db.service.create({
      data: { id: svcId, name: svcName, model: 'Theo giờ', sort: 999 },
    });
  });
  afterAll(async () => {
    await t.prisma.db.serviceRequest.deleteMany({ where: { code: { in: codes } } });
    await t.prisma.db.service.deleteMany({ where: { id: { in: [svcId, ...createdSvc] } } });
    await t.close();
  });

  it('portal: danh mục dịch vụ + gửi phiếu yêu cầu', async () => {
    const list = await ep(t, 'GET', '/services', '/services', items(serviceSchema), {
      token: member,
    });
    expect(list.data.items.some((s) => s.id === svcId)).toBe(true);
    const r = await ep(t, 'POST', '/service-requests', '/service-requests', serviceRequestSchema, {
      token: member,
      json: {
        serviceId: svcId,
        requesterType: 'personal',
        fullName: 'Người Hợp Đồng',
        phone: '0901234567',
        email: 'hopdong@vd.vn',
        address: 'Hà Nội',
        note: 'Cần tư vấn',
        details: { 'Nghề nghiệp / vai trò': 'Freelancer' },
      },
    });
    codes.push(r.data.code);
  });

  it('admin: phiếu — danh sách, tóm tắt, nhân sự, đổi trạng thái, phụ trách, bình luận, xuất', async () => {
    const r = await ep(t, 'POST', '/service-requests', '/service-requests', serviceRequestSchema, {
      token: member,
      json: {
        serviceId: svcId,
        requesterType: 'business',
        fullName: 'Doanh Nghiệp Thử',
        phone: '0901234568',
        email: 'dn@vd.vn',
        organization: 'Công ty Hợp Đồng',
        taxCode: '0101234567',
        address: 'Hà Nội',
        note: 'Cần tư vấn',
        details: {
          'Loại hình': 'Doanh nghiệp',
          'Quy mô nhân sự': '1 – 10 người',
          'Chức vụ người liên hệ': 'Giám đốc',
        },
      },
    });
    const code = r.data.code;
    codes.push(code);
    const base = `/admin/service-requests/${encodeURIComponent(code)}`;

    const page = await ep(
      t,
      'GET',
      '/admin/service-requests',
      `/admin/service-requests?page=1&size=10&q=${code}`,
      pageSchema(serviceRequestSchema),
      { token: admin },
    );
    expect(page.data.items.map((i) => i.code)).toEqual([code]);
    await ep(
      t,
      'GET',
      '/admin/service-requests/summary',
      '/admin/service-requests/summary',
      serviceRequestSummarySchema,
      { token: admin },
    );
    await ep(
      t,
      'GET',
      '/admin/service-requests/staff',
      '/admin/service-requests/staff',
      items(staffMemberSchema),
      { token: admin },
    );
    const tr = await ep(
      t,
      'POST',
      '/admin/service-requests/:code/transition',
      `${base}/transition`,
      serviceRequestSchema,
      { token: admin, json: { from: 'new', to: 'consulting' } },
    );
    expect(tr.data.status).toBe('consulting');
    const patched = await ep(
      t,
      'PATCH',
      '/admin/service-requests/:code',
      base,
      serviceRequestSchema,
      { token: admin, json: { status: 'quoted', assignee: 'Nhân sự hợp đồng' } },
    );
    expect(patched.data).toMatchObject({ status: 'quoted', assignee: 'Nhân sự hợp đồng' });
    await ep(
      t,
      'PATCH',
      '/admin/service-requests/:code/assignee',
      `${base}/assignee`,
      serviceRequestSchema,
      { token: admin, json: { assignee: null } },
    );
    await ep(
      t,
      'POST',
      '/admin/service-requests/:code/comments',
      `${base}/comments`,
      adminServiceCommentSchema,
      { token: admin, json: { body: '<p>Gọi lại khách</p>', mentions: [] } },
    );
    const cms = await ep(
      t,
      'GET',
      '/admin/service-requests/:code/comments',
      `${base}/comments`,
      items(adminServiceCommentSchema),
      { token: admin },
    );
    expect(cms.data.items.length).toBe(1);
    await ep(
      t,
      'POST',
      '/admin/service-requests/export',
      '/admin/service-requests/export',
      csvFileSchema,
      { token: admin },
    );
  });

  it('admin: danh mục dịch vụ — liệt kê, thêm, sửa, xoá', async () => {
    await ep(t, 'GET', '/admin/services', '/admin/services', items(adminServiceSchema), {
      token: admin,
    });
    const created = await ep(t, 'POST', '/admin/services', '/admin/services', adminServiceSchema, {
      token: admin,
      json: {},
    });
    createdSvc.push(created.data.id);
    const p = await ep(
      t,
      'PATCH',
      '/admin/services/:id',
      `/admin/services/${created.data.id}`,
      adminServiceSchema,
      { token: admin, json: { name: 'DV hợp đồng', enabled: false } },
    );
    expect(p.data).toMatchObject({ name: 'DV hợp đồng', enabled: false });
    await ep(t, 'DELETE', '/admin/services/:id', `/admin/services/${created.data.id}`, idSchema, {
      token: admin,
    });
  });
});
