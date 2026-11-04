'use client';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import type { RegionalSlot } from '@opchub/shared/api-domains';
import type { useRegionalWrites } from './use-regional-writes';

export function useRegionalConfirmations(
  slot: RegionalSlot,
  mutate: ReturnType<typeof useRegionalWrites>['mutateAsync'],
  candidates: NonNullable<RegionalSlot['member']>[] = [],
) {
  const { modal } = App.useApp();
  const t = useTranslations('affiliate.regional');
  return {
    change: (id: string) => {
      if (id === slot.member?.id) return;
      const member = candidates.find((m) => m.id === id);
      if (!member) return;
      modal.confirm({
        title: t('confirmAppoint'),
        content: t('appointHint'),
        onOk: () =>
          mutate({ kind: 'appoint', userId: id, name: member.fullName, email: member.email }),
      });
    },
    revoke: () => {
      modal.confirm({
        title: t('confirmRevoke'),
        content: t('revokeHint'),
        onOk: () => mutate({ kind: 'revoke', name: slot.member?.fullName ?? '' }),
      });
    },
  };
}
