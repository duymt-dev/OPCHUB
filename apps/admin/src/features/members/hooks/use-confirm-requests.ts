'use client';

import { useTranslations } from 'next-intl';
import type { ConfirmRequest } from '@opchub/ui';
import { useNumberText } from '@/i18n/use-number-text';

/** Nội dung hộp xác nhận: khoá tài khoản (D-32, luật 10) và đổi quyền hệ thống (D-42) */
export function useConfirmRequests() {
  const numberText = useNumberText();
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
    lockMany: (n: number) => t('lockConfirm.many', { n: numberText(n) }),
  };
}
