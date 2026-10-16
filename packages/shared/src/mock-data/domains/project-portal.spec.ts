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
  myPortalProjects,
  portalComments,
  projectDetail,
  projectInterests,
  projectStats,
  resolveComment,
  saveProject,
} from './index';
import { resetMockDb } from './store';

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
  it('khám phá: 6 dự án công khai, lọc giai đoạn, sắp xếp tên', () => {
    const all = listPortalProjects('m1', { ...ALL });
    expect(all).toHaveLength(6);
    all.forEach((c) => projectCardSchema.parse(c));
    expect(listPortalProjects('m1', { ...ALL, stage: 'mvp' })).toHaveLength(3);
    const byName = listPortalProjects('m1', { ...ALL, sort: 'name' }).map((c) => c.name);
    expect(byName).toEqual([...byName].sort((a, b) => a.localeCompare(b)));
    expect(projectStatsSchema.parse(projectStats('m1')).total).toBe(6);
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

  it('lưu nháp → draft; gửi duyệt → pending_review (máy trạng thái §8)', () => {
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
    expect(sent.ok && sent.data.status).toBe('pending_review');
    expect(myPortalProjects('m1').map((p) => p.id)).toContain(draft.data.id);
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
