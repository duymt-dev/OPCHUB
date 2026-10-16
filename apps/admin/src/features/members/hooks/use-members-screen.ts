'use client';

import { hasPermission } from '@opchub/shared';
import type { AdminMember } from '@opchub/shared/api-domains';
import { useMemo, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import type { ConfirmRequest } from '../components/confirm-dialog';
import { toggleAll } from '../model';
import type { MemberHandlers, MemberPermissions } from '../types';
import { useConfirmRequests } from './use-confirm-requests';
import { useMemberActions } from './use-member-actions';
import { useGroupLookup, useMembers } from './use-members';
import { useMembersUrl } from './use-members-url';

/** Trạng thái màn Thành viên: dữ liệu, URL, lựa chọn, hộp thoại đang mở, thao tác */
export function useMembersScreen() {
  // D-32 / luật 10: khoá tài khoản + đổi quyền luôn hỏi xác nhận; mở khoá làm ngay
  const ask = useConfirmRequests();
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

  const h: MemberHandlers = {
    toggle: (id) => (remember(), setSelected((s) => toggleAll(s, [id]))),
    open: (m) => (remember(), setOpenId(m.id)),
    setStatus: (m, s) =>
      s === 'locked' && m.status !== 'locked'
        ? setConfirm(ask.lock(m.fullName, () => act.setStatus(m, s)))
        : act.setStatus(m, s),
    setRole: (m, r) => setConfirm(ask.role(m, r, () => act.setRole(m, r))),
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
    lockBulk: (ids: string[]) =>
      setConfirm(
        ask.lock(ask.lockMany(ids.length), () => {
          act.setStatusBulk(ids, 'locked');
          setSelected(new Set());
        }),
      ),
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
