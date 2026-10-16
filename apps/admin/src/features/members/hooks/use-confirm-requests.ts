'use client';

import type { AdminMember, ManagedRole } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import type { ConfirmRequest } from '../components/confirm-dialog';

/** Nội dung hộp xác nhận: khoá tài khoản (D-32, luật 10) và đổi quyền hệ thống (D-42) */
export function useConfirmRequests() {
  const t = useTranslations('members');
  return {
    lock: (who: string, onOk: () => void): ConfirmRequest => ({
      title: t('lockConfirm.title'),
      body: t('lockConfirm.body', { who }),
      okLabel: t('lockConfirm.ok'),
      cancelLabel: t('lockConfirm.cancel'),
      danger: true,
      onOk,
    }),
    lockMany: (n: number) => t('lockConfirm.many', { n }),
    role: (m: AdminMember, r: ManagedRole, onOk: () => void): ConfirmRequest => ({
      title: t('roleConfirm.title'),
      body: t('roleConfirm.body', {
        name: m.fullName,
        from: t(`role.${m.systemRole}`),
        to: t(`role.${r}`),
      }),
      okLabel: t('roleConfirm.ok'),
      cancelLabel: t('roleConfirm.cancel'),
      onOk,
    }),
  };
}
