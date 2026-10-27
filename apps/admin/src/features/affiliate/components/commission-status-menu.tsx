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
  restore,
}: {
  row: Pick<CommissionRow, 'id' | 'status'>;
  cancel: (ids: string[]) => void;
  /** D-110: Đã hủy → Đã ghi nhận */
  restore: (ids: string[]) => void;
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
              // Chi trả theo tháng (khoá); D-110: chỉ hủy khoản đã ghi nhận hoặc khôi phục khoản đã hủy
              disabled:
                !access.write ||
                !(
                  (status === 'cancelled' && row.status === 'recorded') ||
                  (status === 'recorded' && row.status === 'cancelled')
                ),
            })),
          },
        ],
        onClick: ({ key }) => {
          if (!access.guard('affiliate.action')) return;
          if (key === 'cancelled' && row.status === 'recorded') cancel([row.id]);
          if (key === 'recorded' && row.status === 'cancelled') restore([row.id]);
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
