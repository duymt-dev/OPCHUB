'use client';

import type { useMembersScreen } from '../hooks/use-members-screen';
import { AssignModal } from './assign-modal';
import { ConfirmDialog } from './confirm-dialog';
import { MemberDrawer } from './member-drawer';

/** Modal gán nhóm (D-12), drawer hồ sơ (D-16), hộp xác nhận (D-32 / D-42) */
export function MemberDialogs({ s }: { s: ReturnType<typeof useMembersScreen> }) {
  const target = s.assignTargets;
  return (
    <>
      {target ? (
        <AssignModal
          targets={target.members}
          groups={s.groups}
          onClose={s.closeAssign}
          onSave={(g, r) => s.act.assign(target.ids, g, r).then(s.clear)}
        />
      ) : null}
      {s.opened ? (
        <MemberDrawer
          m={s.opened}
          groups={s.groups}
          canVerify={s.can.edit}
          onClose={s.closeDrawer}
          onDecide={s.act.verify}
          confirm={s.setConfirm}
        />
      ) : null}
      <ConfirmDialog req={s.confirm} onClose={() => s.setConfirm(null)} />
    </>
  );
}
