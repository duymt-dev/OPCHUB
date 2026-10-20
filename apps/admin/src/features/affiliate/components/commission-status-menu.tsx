'use client';

import { CheckOutlined, EllipsisOutlined } from '@ant-design/icons';
import { Button, Dropdown } from 'antd';
import { useTranslations } from 'next-intl';
import { useAffiliateAccess } from '../hooks/use-affiliate-access';
import type { CommissionRow } from '../types';

export function CommissionStatusMenu({
  row,
  cancel,
}: {
  row: Pick<CommissionRow, 'id' | 'status'>;
  cancel: (ids: string[]) => void;
}) {
  const t = useTranslations('affiliate');
  const access = useAffiliateAccess();
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items: [
          {
            type: 'group',
            label: t('changeStatus'),
            children: (['recorded', 'cancelled', 'paid'] as const).map((status) => ({
              key: status,
              label:
                status === 'cancelled' && row.status !== 'cancelled'
                  ? t('cancelTitle')
                  : t(`status.${status}`),
              icon: row.status === status ? <CheckOutlined aria-hidden /> : undefined,
              danger: status === 'cancelled' && row.status === 'recorded',
              // Payout is monthly; terminal commissions must never be restored here.
              disabled: status !== 'cancelled' || row.status !== 'recorded' || !access.write,
            })),
          },
        ],
        onClick: ({ key }) => {
          if (key === 'cancelled' && row.status === 'recorded' && access.guard('affiliate.action'))
            cancel([row.id]);
        },
      }}
    >
      <Button
        data-ro-ok
        type="text"
        size="small"
        aria-label={t('changeStatus')}
        icon={<EllipsisOutlined aria-hidden />}
      />
    </Dropdown>
  );
}
