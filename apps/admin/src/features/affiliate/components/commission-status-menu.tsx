'use client';

import { CheckOutlined, EllipsisOutlined } from '@ant-design/icons';
import { Button, Dropdown } from 'antd';
import { useTranslations } from 'next-intl';
import { useAffiliateAccess } from '../hooks/use-affiliate-access';
import type { CommissionRow } from '../types';
import styles from './commission-status-menu.module.css';

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
      placement="bottomRight"
      classNames={{ root: styles.popup ?? '' }}
      menu={{
        items: [
          {
            type: 'group',
            label: t('changeStatus'),
            children: (['recorded', 'cancelled', 'paid'] as const).map((status) => ({
              key: status,
              label: (
                <span className={styles.label}>
                  <span className={styles.text}>
                    {status === 'cancelled' && row.status !== 'cancelled'
                      ? t('cancelTitle')
                      : t(`status.${status}`)}
                  </span>
                  {row.status === status ? (
                    <CheckOutlined className={styles.check} aria-hidden />
                  ) : null}
                </span>
              ),
              icon: <span className={`${styles.dot} ${styles[status]}`} aria-hidden />,
              className: row.status === status ? (styles.current ?? '') : '',
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
      <div className={styles.trigger} data-ro-ok>
        <Button
          data-ro-ok
          type="text"
          size="small"
          aria-label={t('changeStatus')}
          icon={<EllipsisOutlined aria-hidden />}
        />
      </div>
    </Dropdown>
  );
}
