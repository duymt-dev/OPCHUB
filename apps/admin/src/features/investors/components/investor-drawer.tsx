'use client';

import type { AdminInvestor, InvestorStatus } from '@opchub/shared/api-domains';
import { INVESTOR_STEPS } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { canStep, STATUS_TONE } from '../model';
import { InvestorComposer } from './investor-composer';
import { InvestorProfile, InvestorProjects } from './investor-profile';
import { InvestorThread } from './investor-thread';
import styles from './investor-drawer.module.css';

interface Props {
  x: AdminInvestor;
  onClose: () => void;
  onStatus: (s: InvestorStatus) => void;
  onCall: () => void;
  onCopy: () => void;
  onSend: (body: string) => Promise<unknown>;
}

/**
 * D-60 "Thông tin nhà đầu tư" 440px. Tự vẽ role=dialog (không motion antd — parity dừng
 * đồng hồ); Esc / bấm nền / × đóng. Không có URL riêng (D-39).
 */
export function InvestorDrawer({ x, onClose, onStatus, onCall, onCopy, onSend }: Props) {
  const t = useTranslations('investors');
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
          <div className={styles.section}>
            <span className={styles.label} id="iv-steps">
              {d('status')}
            </span>
            <div className={styles.steps} role="radiogroup" aria-labelledby="iv-steps">
              {INVESTOR_STEPS.map((s) => {
                const cur = x.status === s;
                // BUG-007, §9: chỉ bước kế tiếp bấm được; lùi / nhảy cóc bị khoá
                const locked = !cur && !canStep(x.status, s);
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={cur}
                    aria-disabled={locked || undefined}
                    disabled={locked}
                    className={`${styles.step} ${cur ? styles[STATUS_TONE[s]] : ''}`}
                    onClick={() => !cur && !locked && onStatus(s)}
                  >
                    {t(`status.${s}`)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className={styles.btns}>
            <button type="button" className={styles.primary} onClick={onCall}>
              {d('call')}
            </button>
            <button type="button" className={styles.ghost} onClick={onCopy}>
              {d('copy')}
            </button>
          </div>
          <InvestorProjects x={x} />
          <InvestorThread investorKey={x.key} />
        </div>
        <InvestorComposer key={x.key} onSend={onSend} />
      </aside>
    </div>
  );
}
