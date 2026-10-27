import { beforeEach, describe, expect, it } from 'vitest';
import { adminProjectReviewSchema, adminProjectSchema } from '../../api-domains';
import {
  auditLog,
  bulkProjects,
  deleteProjects,
  getAdminProject,
  listAdminProjects,
  projectCounts,
  setFeaturedProject,
  transitionProject,
} from './index';
import { mockDb, resetMockDb } from './store';

beforeEach(() => resetMockDb());

describe('dự án · kiểm duyệt admin (mock)', () => {
  it('đếm theo trạng thái như prototype v4: 2 chờ duyệt, 11 hiển thị, 1 ẩn, 1 cần sửa', () => {
    expect(projectCounts()).toMatchObject({
      pending_review: 2,
      published: 11,
      hidden: 1,
      needs_changes: 1,
      rejected: 0,
      draft: 0,
    });
    const pending = listAdminProjects('pending_review');
    expect(pending.map((p) => p.name)).toEqual(['HalalLink', 'EduMate']);
    pending.forEach((p) => adminProjectSchema.parse(p));
  });

  it('hồ sơ HalalLink: repo, link test, nhóm chia sẻ, gọi vốn', () => {
    const r = getAdminProject('p7');
    if (!r.ok) throw new Error('missing');
    expect(r.data.repo?.url).toBe('https://github.com/halallink/platform');
    expect(r.data.testUrl).toBe('https://staging.halallink.id');
    expect(r.data.groupNames).toEqual(['OPC Hà Nội', 'OPC Đà Nẵng']);
    expect(r.data.funding?.currency).toBe('USD');
  });

  it('chỉ chuyển trạng thái hợp lệ (SRS §8) và ghi audit', () => {
    expect(transitionProject('admin', 'p7', 'approve').ok).toBe(true);
    expect(mockDb().projects.find((p) => p.id === 'p7')?.status).toBe('published');
    // đã hiển thị thì không duyệt lại / từ chối được
    const again = transitionProject('admin', 'p7', 'reject', 'Spam');
    expect(again.ok ? 200 : again.status).toBe(409);
    expect(transitionProject('admin', 'p7', 'hide').ok).toBe(true);
    expect(transitionProject('admin', 'p7', 'republish').ok).toBe(true);
    expect(auditLog().map((a) => a.action)).toEqual([
      'project.republish',
      'project.hide',
      'project.approve',
    ]);
  });

  it('yêu cầu chỉnh sửa / từ chối bắt buộc ghi chú; ghi chú lưu lại', () => {
    expect(adminProjectReviewSchema.safeParse({ decision: 'reject' }).success).toBe(false);
    expect(adminProjectReviewSchema.safeParse({ decision: 'hide' }).success).toBe(true);
    transitionProject('admin', 'p8', 'request_changes', 'Thiếu thông tin mô tả');
    const p = mockDb().projects.find((x) => x.id === 'p8');
    expect(p?.status).toBe('needs_changes');
    expect(p?.reviewNote).toBe('Thiếu thông tin mô tả');
  });

  it('bulk: xuất bản chỉ dự án chờ duyệt / đã ẩn, bỏ qua phần còn lại', () => {
    const r = bulkProjects('admin', ['p7', 'p5', 'p9'], 'publish');
    expect(r).toEqual({ done: ['p7', 'p5'], skipped: ['p9'] });
    expect(bulkProjects('admin', ['p7', 'p8'], 'hide')).toEqual({ done: ['p7'], skipped: ['p8'] });
  });

  it('xoá dự án + góp ý; id không có thì bỏ qua', () => {
    const before = mockDb().comments.filter((c) => c.projectId === 'p1').length;
    expect(before).toBeGreaterThan(0);
    expect(deleteProjects('admin', ['p1', 'x'])).toEqual({ done: ['p1'], skipped: ['x'] });
    expect(mockDb().comments.some((c) => c.projectId === 'p1')).toBe(false);
    expect(auditLog()[0]).toMatchObject({ action: 'project.delete', target: 'p1' });
  });

  it('nổi bật tuần: chỉ dự án đang hiển thị, ẩn thì mất nổi bật', () => {
    const bad = setFeaturedProject('admin', 'p7');
    expect(bad.ok ? 200 : bad.status).toBe(409);
    expect(setFeaturedProject('admin', 'p1').ok).toBe(true);
    expect(listAdminProjects('published').find((p) => p.id === 'p1')?.featured).toBe(true);
    transitionProject('admin', 'p1', 'hide');
    expect(listAdminProjects('hidden').find((p) => p.id === 'p1')?.featured).toBe(false);
  });
});
