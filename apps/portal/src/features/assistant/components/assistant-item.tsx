'use client';

import type { Service } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { ServiceIcon } from '@/features/services';
import styles from './assistant.module.css';

interface Props {
  s: Service;
  open: boolean;
  onToggle: () => void;
  onConsult: () => void;
}

/** Một mục danh mục (prototype `svItems`: accordion `acTg` + nút `wgo` mở form tư vấn) */
export function AssistantItem({ s, open, onToggle, onConsult }: Props) {
  const t = useTranslations('assistant');
  const bodyId = `assistant-svc-${s.id}`;
  return (
    <div className={styles.item} data-open={open ? '1' : '0'} data-service={s.id}>
      <button
        type="button"
        className={styles.itemHead}
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        <ServiceIcon id={s.id} className={styles.itemIcon} />
        <span className={styles.itemName}>{s.name}</span>
        <svg className={styles.chev} width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" />
        </svg>
      </button>
      {open ? (
        <div id={bodyId} className={styles.itemBody}>
          <span className={styles.model}>{s.model}</span>
          <p className={styles.desc}>{s.description}</p>
          <button type="button" className={styles.consult} onClick={onConsult}>
            {t('consult')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
