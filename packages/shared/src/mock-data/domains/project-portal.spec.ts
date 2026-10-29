import { beforeEach, describe, expect, it } from 'vitest';
import {
  createInterestPortalSchema,
  projectCardSchema,
  projectDetailSchema,
  projectSaveSchema,
  projectStatsSchema,
} from '../../api-domains';
import {
  createPortalInterest,
  followProject,
  listPortalProjects,
  listAdminProjects,
  myPortalProjects,
  ownProject,
  portalComments,
  projectCounts,
  projectDetail,
  projectInterests,
  projectStats,
  resolveComment,
  saveProject,
  transitionProject,
} from './index';
import { mockDb, resetMockDb } from './store';

beforeEach(() => resetMockDb());

const ALL = { q: '', sort: 'new' } as const;
const interest = createInterestPortalSchema.parse({
  kind: 'individual',
  contactName: 'Nguyễn Văn An',
  phone: '0912345678',
  amount: 100_000_000,
  message: 'Quan tâm',
});

describe('dự án · cổng thành viên (mock)', () => {
  it('D-109 khám phá loại chủ hết phí, lọc / sắp xếp và khôi phục khi phí khả dụng', () => {
    const all = listPortalProjects('m1', { ...ALL });
    expect(all).toHaveLength(10);
    expect(all.map((p) => p.id)).not.toContain('p4');
    all.forEach((c) => projectCardSchema.parse(c));
    // D-109 excludes p4 (student owner m6 has no usable fee), even when shared with m1.
    expect(listPortalProjects('m1', { ...ALL, stages: ['mvp'] })).toHaveLength(4);
    expect(listPortalProjects('m1', { ...ALL, audience: 'student' })).toHaveLength(2);
    expect(listPortalProjects('m1', { ...ALL, provinces: ['Hà Nội'] })).toHaveLength(2);
    expect(listPortalProjects('m1', { ...ALL, needs: ['investors'] })).toHaveLength(5);
    const views = listPortalProjects('m1', { ...ALL, sort: 'view' }).map((c) => c.views);
    expect(views).toEqual([...views].sort((a, b) => b - a));
    expect(all.find((c) => c.id === 'p1')).toMatchObject({
      province: 'Hải Phòng',
      stage: 'growth',
    });
    const byName = listPortalProjects('m1', { ...ALL, sort: 'name' }).map((c) => c.name);
    expect(byName).toEqual([...byName].sort((a, b) => a.localeCompare(b)));
    // Hero uses the same visibility predicate, not stale prototype totals.
    expect(projectStatsSchema.parse(projectStats('m1'))).toMatchObject({
      total: 10,
      owners: 10,
      connections: 37,
    });
    const fee = mockDb().fees.find((f) => f.userId === 'm6');
    if (!fee) throw new Error('Missing m6 fee fixture');
    Object.assign(fee, { status: 'active', validUntil: '2099-01-01T00:00:00.000Z' });
    const restored = listPortalProjects('m1', { ...ALL });
    expect(restored).toHaveLength(11);
    expect(restored.map((p) => p.id)).toContain('p4');
  });

  it('theo dõi cập nhật số người theo dõi', () => {
    const before = listPortalProjects('m1', { ...ALL }).find((c) => c.id === 'p1');
    followProject('m1', 'p1', true);
    const after = listPortalProjects('m1', { ...ALL }).find((c) => c.id === 'p1');
    expect(after?.followedByMe).toBe(true);
    expect(after?.followers).toBe((before?.followers ?? 0) + 1);
  });

  it('chi tiết đúng hợp đồng; dự án không tồn tại → 404', () => {
    const r = projectDetail('m1', 'p1');
    expect(r.ok).toBe(true);
    if (r.ok) projectDetailSchema.parse(r.data);
    expect(projectDetail('m1', 'zzz').ok).toBe(false);
  });

  it('REQ-612 D-108 lưu nháp → draft; gửi đăng → published ngay', () => {
    const draft = saveProject('m1', projectSaveSchema.parse({ name: 'Dự án thử' }));
    expect(draft.ok && draft.data.status).toBe('draft');
    if (!draft.ok) return;
    const sent = saveProject(
      'm1',
      projectSaveSchema.parse({
        name: 'Dự án thử',
        category: 'Fintech',
        summary: 'Thử',
        testUrl: 'https://demo.thu.app',
        submit: true,
      }),
      draft.data.id,
    );
    expect(sent.ok && sent.data.status).toBe('published');
    expect(myPortalProjects('m1').map((p) => p.id)).toContain(draft.data.id);
  });

  it('REQ-612 D-108 sửa dự án hiển thị → áp ngay không tạo revision; bị từ chối → 409', () => {
    const body = projectSaveSchema.parse({
      name: 'OPC Hub Mobile 2',
      category: 'AI / SaaS',
      summary: 'Mới',
      testUrl: 'https://demo.thu.app',
      submit: true,
    });
    const r = saveProject('m1', body, 'p10');
    expect(r.ok && r.data).toMatchObject({
      status: 'published',
      name: 'OPC Hub Mobile 2',
      revision: null,
    });
    // Sửa lần 2 cũng áp ngay, không làm tăng danh sách chờ duyệt.
    saveProject('m1', { ...body, name: 'OPC Hub Mobile 3' }, 'p10');
    expect(listAdminProjects('pending_review').filter((p) => p.id === 'p10')).toHaveLength(0);
    expect(projectCounts().pending_review).toBe(2);
    const pub = projectDetail('m2', 'p10');
    expect(pub.ok && pub.data.name).toBe('OPC Hub Mobile 3');
    const own = ownProject('m1', 'p10');
    expect(own.ok && own.data.name).toBe('OPC Hub Mobile 3');
    const done = transitionProject('a1', 'p10', 'approve');
    expect(done.ok ? 200 : done.status).toBe(409);
    const d = projectDetail('m2', 'p10');
    expect(d.ok && d.data.revision).toBeNull();
    // khối "Vấn đề / Giải pháp / Thị trường" là dữ liệu dự án — sửa nội dung không xoá
    expect(d.ok && d.data.highlights.map((h) => h.title)).toEqual([
      'Vấn đề',
      'Giải pháp',
      'Thị trường',
    ]);

    const p = mockDb().projects.find((x) => x.id === 'p10');
    if (p) p.status = 'rejected';
    expect(saveProject('m1', body, 'p10').ok).toBe(false);
  });

  it('không sửa được dự án của người khác', () => {
    expect(saveProject('m1', projectSaveSchema.parse({ name: 'x' }), 'p1').ok).toBe(false);
  });

  it('quan tâm đầu tư: cùng Idempotency-Key trả lại bản cũ, không tạo trùng', () => {
    const a = createPortalInterest('m1', 'p1', interest, 'key-1');
    const b = createPortalInterest('m1', 'p1', interest, 'key-1');
    expect(a.ok && b.ok && a.data.id === b.data.id).toBe(true);
    const c = createPortalInterest('m1', 'p1', interest, 'key-2');
    expect(c.ok ? null : c.status).toBe(409);
  });

  it('quan tâm đầu tư: chủ dự án không tự quan tâm; dưới mức tối thiểu bị chặn', () => {
    const own = createPortalInterest('m1', 'p10', interest, 'k-own');
    expect(own.ok ? null : own.status).toBe(403);
    const low = createPortalInterest('m1', 'p1', { ...interest, amount: 1000 }, 'k-low');
    expect(low.ok ? null : low.status).toBe(409);
  });

  it('chỉ chủ dự án xem nhà đầu tư và tiếp nhận góp ý', () => {
    expect(projectInterests('m1', 'p1').ok).toBe(false);
    const mine = projectInterests('m1', 'p10');
    expect(mine.ok && mine.data.length).toBe(2);

    const now = Date.now();
    const onOthers = portalComments('m1', 'p1', now)[0];
    expect(onOthers && resolveComment('m1', onOthers.id, true).ok).toBe(false);
    const onMine = portalComments('m1', 'p10', now)[0];
    expect(onMine && resolveComment('m1', onMine.id, true).ok).toBe(true);
  });
});
