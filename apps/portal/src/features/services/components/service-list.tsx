'use client';

import { useTranslations } from 'next-intl';
import { useServices } from '../hooks/use-consult-form';
import { ServiceIcon } from './service-icon';
import styles from './service-list.module.css';

/** Phần dưới popup Gói dịch vụ v4 (`svcards`): "Hỗ trợ phát triển doanh nghiệp" + nút "Đăng ký" (D-60, LK-08) */
export function ServiceList({ onConsult }: { onConsult: (svcId: string) => void }) {
  const t = useTranslations('services.list');
  const services = useServices();
  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.title}>{t('title')}</span>
        <span className={styles.lead}>{t('lead')}</span>
      </div>
      {(services.data ?? []).map((s) => (
        <div key={s.id} className={styles.item}>
          <ServiceIcon id={s.id} className={styles.icon} />
          <div className={styles.itemText}>
            <span className={styles.name}>{s.name}</span>
            <span className={styles.desc}>{s.description}</span>
          </div>
          <button
            type="button"
            className={styles.consult}
            aria-label={`${t('consult')} ${s.name}`}
            onClick={() => onConsult(s.id)}
          >
            {t('consult')}
          </button>
        </div>
      ))}
    </div>
  );
}
