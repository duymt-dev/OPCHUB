'use client';

import type { UserStatus } from '@opchub/shared';
import type { ManagedRole } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api-client';
import {
  assignGroups,
  decideVerification,
  exportMembers,
  memberKeys,
  updateRole,
  updateStatus,
  updateStatusBulk,
  type AdminMember,
} from '../api';
import { usePatchMembers } from './use-members';

const STATUS_TOAST = { locked: 'locked', active: 'unlocked' } as const;

/**
 * Thao tác ghi của màn Thành viên — mọi thao tác đi qua API (BE ghi audit_logs, luật 10).
 * Trạng thái / vai trò cập nhật lạc quan + toast ngay như prototype; lỗi thì hoàn tác.
 */
export function useMemberActions() {
  const t = useTranslations('members.toast');
  const toast = useToast();
  const qc = useQueryClient();
  const patch = usePatchMembers();
  const refresh = () => void qc.invalidateQueries({ queryKey: memberKeys.all });
  const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : t('failed'));

  const status = useMutation({
    mutationFn: (v: { m: AdminMember; status: UserStatus; from: UserStatus }) =>
      updateStatus(v.m.id, v.status),
    onMutate: (v) => {
      const undo = patch([v.m.id], (m) => ({ ...m, status: v.status }));
      toast(t(STATUS_TOAST[v.status], { name: v.m.fullName }));
      return undo;
    },
    onError: (e, _v, undo) => (undo?.(), fail(e)),
    onSettled: refresh,
  });

  const bulk = useMutation({
    mutationFn: (v: { ids: string[]; status: UserStatus }) => updateStatusBulk(v.ids, v.status),
    onMutate: (v) => {
      const undo = patch(v.ids, (m) => ({ ...m, status: v.status }));
      const key = v.status === 'locked' ? 'bulkLocked' : 'bulkUnlocked';
      toast(t(key, { n: v.ids.length }));
      return undo;
    },
    onError: (e, _v, undo) => (undo?.(), fail(e)),
    onSettled: refresh,
  });

  const role = useMutation({
    mutationFn: (v: { m: AdminMember; role: ManagedRole }) => updateRole(v.m.id, v.role),
    onMutate: (v) => {
      const undo = patch([v.m.id], (m) => ({ ...m, systemRole: v.role }));
      toast(t('role', { name: v.m.fullName }));
      return undo;
    },
    onError: (e, _v, undo) => (undo?.(), fail(e)),
    onSettled: refresh,
  });

  const exporting = useMutation({
    mutationFn: exportMembers,
    onMutate: (ids) => toast(t('exporting', { n: ids.length })),
    onError: fail,
  });

  const assign = useMutation({
    mutationFn: (v: { ids: string[]; groups: string[]; role: 'member' | 'moderator' }) =>
      assignGroups(v.ids, v.groups, v.role),
    onSuccess: (_r, v) => toast(t('assigned', { n: v.ids.length, g: v.groups.length })),
    onError: fail,
    onSettled: refresh,
  });

  const verify = useMutation({
    mutationFn: (v: { m: AdminMember; decision: 'approve' | 'reject' }) =>
      decideVerification(v.m.id, v.decision),
    onSuccess: (_r, v) => {
      const name = v.m.business?.companyName || v.m.fullName;
      toast(t(v.decision === 'approve' ? 'verified' : 'rejected', { name }));
    },
    onError: fail,
    onSettled: refresh,
  });

  return {
    setStatus: (m: AdminMember, s: UserStatus) =>
      m.status !== s && status.mutate({ m, status: s, from: m.status }),
    setStatusBulk: (ids: string[], s: UserStatus) => bulk.mutate({ ids, status: s }),
    setRole: (m: AdminMember, r: ManagedRole) => m.systemRole !== r && role.mutate({ m, role: r }),
    exportCsv: (ids: string[]) => exporting.mutate(ids),
    assign: (ids: string[], groups: string[], r: 'member' | 'moderator') =>
      assign.mutateAsync({ ids, groups, role: r }),
    verify: (m: AdminMember, decision: 'approve' | 'reject') => verify.mutateAsync({ m, decision }),
  };
}
