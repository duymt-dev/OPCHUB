import { describe, expect, it } from 'vitest';
import {
  OWNER_EDITABLE,
  ownerSaveStatus,
  REVISION_TRANSITIONS,
  revisionSaveStatus,
} from './project-status';

describe('D-108 (TIP-V42-711, thay D-18/§9 cũ) trạng thái khi chủ dự án lưu', () => {
  it('gửi (draft/needs_changes/pending_review) → hiện ngay published; rejected/hidden không sửa', () => {
    expect(ownerSaveStatus('draft', true)).toEqual({ kind: 'project', status: 'published' });
    expect(ownerSaveStatus('draft', false)).toEqual({ kind: 'project', status: 'draft' });
    expect(ownerSaveStatus('needs_changes', true)).toEqual({
      kind: 'project',
      status: 'published',
    });
    expect(ownerSaveStatus('needs_changes', false)).toEqual({
      kind: 'project',
      status: 'needs_changes',
    });
    expect(ownerSaveStatus('pending_review', false)).toEqual({
      kind: 'project',
      status: 'pending_review',
    });
    expect(ownerSaveStatus('pending_review', true)).toEqual({
      kind: 'project',
      status: 'published',
    });
    // D-108 (thay D-18): sửa dự án đang hiển thị ghi đè trực tiếp, không còn bản sửa chờ duyệt
    expect(ownerSaveStatus('published', true)).toEqual({ kind: 'project', status: 'published' });
    expect(ownerSaveStatus('published', false)).toEqual({ kind: 'project', status: 'published' });
    expect(ownerSaveStatus('rejected', true)).toBeNull();
    expect(ownerSaveStatus('hidden', false)).toBeNull();
    expect(OWNER_EDITABLE).not.toContain('rejected');
    expect(OWNER_EDITABLE).not.toContain('hidden');
  });

  it('REQ-106 bản sửa: gửi → Chờ duyệt; Admin chỉ quyết bản Chờ duyệt, không ẩn/xuất bản lại', () => {
    expect(revisionSaveStatus(true)).toBe('pending_review');
    expect(revisionSaveStatus(false)).toBe('draft');
    expect(REVISION_TRANSITIONS.approve).toEqual({ from: 'pending_review', to: 'approved' });
    expect(REVISION_TRANSITIONS.reject?.to).toBe('rejected');
    expect(REVISION_TRANSITIONS.request_changes?.to).toBe('needs_changes');
    expect(REVISION_TRANSITIONS.hide).toBeUndefined();
  });
});
