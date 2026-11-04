'use client';
import { regionalProvinces, type RegionalRegion } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import styles from './regional.module.css';

export function RegionalProvincePicker({
  region,
  value,
  disabled,
  onChange,
}: {
  region: RegionalRegion;
  value: string[];
  disabled: boolean;
  onChange: (value: string[]) => void;
}) {
  const t = useTranslations('affiliate.regional');
  return (
    <div className={styles.field}>
      <div className={styles.provinceHeading}>
        <span className={styles.sectionTitle}>{t('provinceTitle')}</span>
        <span>{t('provinceHint')}</span>
      </div>
      <div className={styles.chips}>
        {regionalProvinces(region).map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={value.includes(p)}
            disabled={disabled}
            className={`${styles.chip} ${value.includes(p) ? styles.chipOn : ''}`}
            onClick={() =>
              onChange(value.includes(p) ? value.filter((v) => v !== p) : [...value, p])
            }
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
