'use client';

import { Modal } from '@opchub/ui';
import { Button } from 'antd';
import { useTranslations } from 'next-intl';
import { affiliateMoney } from '../format';
import { useAffiliateWrites } from '../hooks/use-affiliate-writes';
import { affiliateMonthLabel } from '../model';

export interface PayoutIntent {
  id: string;
  name: string;
  month: string;
  amount: number;
  key: string;
}
export function PayoutDialog({ intent, onClose }: { intent: PayoutIntent; onClose: () => void }) {
  const t = useTranslations('affiliate');
  const { payout } = useAffiliateWrites();
  const submit = () => {
    void payout
      .mutateAsync(intent)
      .then((result) => {
        if (result) onClose();
      })
      .catch(() => undefined);
  };
  return (
    <Modal
      open
      title={t('payoutTitle')}
      onClose={onClose}
      size="small"
      dismissible={!payout.isPending}
      maskClosable={!payout.isPending}
      footer={
        <>
          <Button disabled={payout.isPending} onClick={onClose}>
            {t('close')}
          </Button>
          <Button
            aria-label={t('payout')}
            type="primary"
            loading={payout.isPending}
            onClick={submit}
          >
            {t('payout')}
          </Button>
        </>
      }
    >
      <p>
        {t('payoutConfirm', {
          month: affiliateMonthLabel(intent.month),
          name: intent.name,
          amount: affiliateMoney(intent.amount),
        })}
      </p>
    </Modal>
  );
}
