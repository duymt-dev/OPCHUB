import { describe, expect, it } from 'vitest';
import {
  OWNER_EDITABLE,
  ownerSaveStatus,
  REVISION_TRANSITIONS,
  revisionSaveStatus,
} from './project-status';

describe('BUG-033 §9 trạng thái khi chủ dự án lưu', () => {
  it('BUG-033 §9 ownerSaveStatus mọi trạng thái; rejected/hidden không sửa', () => {
    expect(ownerSaveStatus('draft', true)).toEqual({ kind: 'project', status: 'pending_review' });
    expect(ownerSaveStatus('draft', false)).toEqual({ kind: 'project', status: 'draft' });
    expect(ownerSaveStatus('needs_changes', true)).toEqual({
      kind: 'project',
      status: 'pending_review',
    });
    expect(ownerSaveStatus('needs_changes', false)).toEqual({
      kind: 'project',
      status: 'needs_changes',
    });
    // Lưu nháp khi đang Chờ duyệt không lùi về Nháp (cạnh không có trong §9)
    expect(ownerSaveStatus('pending_review', false)).toEqual({
      kind: 'project',
      status: 'pending_review',
    });
    expect(ownerSaveStatus('pending_review', true)).toEqual({
      kind: 'project',
      status: 'pending_review',
    });
    // D-18: đang hiển thị → bản sửa, không đổi `projects`
    expect(ownerSaveStatus('published', true)).toEqual({ kind: 'revision' });
    expect(ownerSaveStatus('published', false)).toEqual({ kind: 'revision' });
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
