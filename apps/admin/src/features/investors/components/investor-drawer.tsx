'use client';

import type { AdminInvestor } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { InvestorProfile, InvestorProjects } from './investor-profile';
import styles from './investor-drawer.module.css';

interface Props {
  x: AdminInvestor;
  onClose: () => void;
  onCopy: () => void;
}

/**
 * D-60 "Thông tin nhà đầu tư" 440px. Tự vẽ role=dialog (không motion antd — parity dừng
 * đồng hồ); Esc / bấm nền / × đóng. Không có URL riêng (D-39). D-72: chỉ hiển thị + Sao chép số.
 */
export function InvestorDrawer({ x, onClose, onCopy }: Props) {
  const d = useTranslations('investors.drawer');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.mask}>
      <button type="button" aria-label={d('close')} className={styles.backdrop} onClick={onClose} />
      <aside className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="iv-title">
        <div className={styles.head}>
          <span id="iv-title" className={styles.title}>
            {d('title')}
          </span>
          <button type="button" aria-label={d('close')} className={styles.x} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.body}>
          <InvestorProfile x={x} />
          <div className={styles.btns}>
            <button type="button" className={styles.ghost} onClick={onCopy}>
              {d('copy')}
            </button>
          </div>
          <InvestorProjects x={x} />
        </div>
      </aside>
    </div>
  );
}
