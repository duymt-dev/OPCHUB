'use client';

import { hasPermission } from '@opchub/shared';
import type { AdminMember } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import type { ConfirmRequest } from '../components/confirm-dialog';
import { toggleAll } from '../model';
import type { MemberHandlers, MemberPermissions } from '../types';
import { useMemberActions } from './use-member-actions';
import { useGroupLookup, useMembers } from './use-members';
import { useMembersUrl } from './use-members-url';

/** Trạng thái màn Thành viên: dữ liệu, URL, lựa chọn, hộp thoại đang mở, thao tác */
export function useMembersScreen() {
  const t = useTranslations('members');
  const role = useAuthStore((s) => s.me?.systemRole ?? 'member');
  const can: MemberPermissions = {
    edit: hasPermission(role, 'm.edit'),
    role: hasPermission(role, 's.role'),
  };
  const url = useMembersUrl();
  const list = useMembers(url.params);
  const groups = useGroupLookup();
  const act = useMemberActions();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [assignIds, setAssignIds] = useState<string[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  // Thành viên đã thấy qua các trang — modal gán nhóm / drawer vẫn có tên khi đổi trang
  const [seen, setSeen] = useState<Map<string, AdminMember>>(new Map());

  const rows = useMemo(() => list.data?.items ?? [], [list.data]);
  const known = useMemo(() => {
    const m = new Map(seen);
    rows.forEach((r) => m.set(r.id, r));
    return m;
  }, [seen, rows]);
  const remember = () => setSeen(known);
  const pick = (ids: string[]) =>
    ids.map((id) => known.get(id)).filter((m): m is AdminMember => !!m);

  const askRole: MemberHandlers['setRole'] = (m, r) =>
    setConfirm({
      title: t('roleConfirm.title'),
      body: t('roleConfirm.body', {
        name: m.fullName,
        from: t(`role.${m.systemRole}`),
        to: t(`role.${r}`),
      }),
      okLabel: t('roleConfirm.ok'),
      cancelLabel: t('roleConfirm.cancel'),
      onOk: () => act.setRole(m, r),
    });

  const h: MemberHandlers = {
    toggle: (id) => (remember(), setSelected((s) => toggleAll(s, [id]))),
    open: (m) => (remember(), setOpenId(m.id)),
    setStatus: (m, s) => act.setStatus(m, s),
    setRole: askRole,
    assign: (ids) => (remember(), setAssignIds(ids)),
  };

  return {
    ...url,
    list,
    rows,
    groups,
    act,
    can,
    h,
    selected,
    clear: () => setSelected(new Set()),
    toggleAll: () =>
      setSelected((s) =>
        toggleAll(
          s,
          rows.map((r) => r.id),
        ),
      ),
    assignTargets: assignIds ? { ids: assignIds, members: pick(assignIds) } : null,
    closeAssign: () => setAssignIds(null),
    opened: openId ? known.get(openId) : undefined,
    closeDrawer: () => setOpenId(null),
    confirm,
    setConfirm,
  };
}
