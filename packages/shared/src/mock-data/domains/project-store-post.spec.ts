import { beforeEach, describe, expect, it } from 'vitest';
import { projectSaveSchema } from '../../api-domains';
import { listPortalProjects, projectDetail, saveProject } from './ops-project-portal';
import { extOf } from './project-store';
import { mockDb, resetMockDb } from './store';

beforeEach(() => resetMockDb());
const body = projectSaveSchema.parse({
  name: 'Dự án gian hàng',
  category: 'Chuyển đổi số & AI',
  summary: 'Giới thiệu dự án',
  testUrl: 'https://example.test',
  submit: true,
  storeId: 'st1',
  province: 'Cà Mau',
});

describe('REQ-612 QT-ST-PJ mock', () => {
  it('lưu liên kết/tỉnh, lọc đúng storeId và không trả dự án riêng tư cho người lạ', () => {
    // Tiền điều kiện gian hàng trống (seed chuẩn có OPC Hub Mobile).
    const seeded = mockDb().projects.find((p) => p.id === 'p10');
    if (!seeded) throw new Error('Missing fixture');
    extOf(seeded).storeId = null;
    const result = saveProject('m1', body);
    if (!result.ok) throw new Error(result.message);
    expect(result.data).toMatchObject({ status: 'published', storeId: 'st1', province: 'Cà Mau' });
    expect(listPortalProjects('m1', { storeId: 'st1', sort: 'new' }).map((p) => p.id)).toEqual([
      result.data.id,
    ]);
    expect(listPortalProjects('m1', { storeId: 'st2', sort: 'new' })).toEqual([]);
    saveProject('m1', { ...body, visibility: 'private', groupIds: [] }, result.data.id);
    expect(listPortalProjects('m2', { storeId: 'st1', sort: 'new' })).toEqual([]);
    expect(saveProject('m2', body)).toMatchObject({ ok: false, status: 403 });
  });

  it('D-109 hết phí ẩn công khai; gia hạn tự hiện lại, giữ dữ liệu', () => {
    const p = mockDb().projects.find((x) => x.id === 'p10');
    const fee = mockDb().fees.find((f) => f.userId === 'm1');
    if (!p || !fee) throw new Error('Missing fixture');
    extOf(p).groupIds = [];
    Object.assign(fee, { status: 'expired', validUntil: new Date(0).toISOString() });
    // D-109 applies to team members too; only the owner retains access while expired.
    expect(projectDetail('m2', p.id)).toMatchObject({ ok: false, status: 404 });
    expect(projectDetail('m3', p.id)).toMatchObject({ ok: false, status: 404 });
    expect(projectDetail('m1', p.id).ok).toBe(true);
    Object.assign(fee, { status: 'trial', validUntil: new Date(Date.now() + 864e5).toISOString() });
    expect(projectDetail('m3', p.id).ok).toBe(true);
    expect(projectDetail('m2', p.id).ok).toBe(true);
    expect(p.status).toBe('published');
  });
});
