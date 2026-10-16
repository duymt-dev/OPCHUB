'use client';

import { useTranslations } from 'next-intl';
import { useServices } from '../hooks/use-consult-form';
import styles from './service-list.module.css';

/** Cột phải popup Gói dịch vụ: "Chương trình & dịch vụ khác" + nút "Tư vấn" (P-79) */
export function ServiceList({ onConsult }: { onConsult: (svcId: string) => void }) {
  const t = useTranslations('services.list');
  const services = useServices();
  return (
    <div className={styles.panel}>
      <div className={styles.banner}>
        <div className={styles.icon} aria-hidden="true">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 7H4v13h16zM16 7V4H8v3M4 12h16" />
          </svg>
        </div>
        <div className={styles.bannerText}>
          <span className={styles.bannerTitle}>{t('title')}</span>
          <span className={styles.bannerLead}>{t('lead')}</span>
        </div>
      </div>
      <div className={styles.items}>
        {(services.data ?? []).map((s) => (
          <div key={s.id} className={styles.item}>
            <div className={styles.itemText}>
              <div className={styles.itemHead}>
                <span className={styles.name}>{s.name}</span>
                <span className={styles.model}>{s.model}</span>
              </div>
              <span className={styles.desc} title={s.description}>
                {s.description}
              </span>
            </div>
            <button type="button" className={styles.consult} onClick={() => onConsult(s.id)}>
              {t('consult')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
