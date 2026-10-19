'use client';

import type { LiveCountry } from '@opchub/shared/api-domains';
import { Icon } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { fmtNumber } from '../model';
import styles from './country-list.module.css';
import card from './dashboard.module.css';

/** Số tỉnh hiện khi chưa bấm "Xem thêm" */
const PREVIEW = 5;

/** P-03: "Quốc gia" — mở/đóng từng nước (VN mở sẵn), "Xem thêm N tỉnh/thành" / "Thu gọn" */
export function CountryList({ countries, total }: { countries: LiveCountry[]; total: number }) {
  const t = useTranslations('dashboard.countries');
  const [open, setOpen] = useState<Record<string, boolean>>({ VN: true });
  const [full, setFull] = useState<Record<string, boolean>>({});
  const max = Math.max(1, ...countries.map((c) => c.total));

  return (
    <section className={card.card}>
      <div className={card.cardHead}>
        <div className={card.cardTitle}>{t('title')}</div>
        <span className={card.cardMeta}>{t('total', { n: fmtNumber(total) })}</span>
      </div>
      {countries.length ? null : <div className={styles.more}>{t('none')}</div>}
      {countries.map((c) => {
        const isOpen = !!open[c.code];
        const isFull = !!full[c.code];
        const pMax = Math.max(1, ...c.provinces.map((p) => p.count));
        const shown = isFull ? c.provinces : c.provinces.slice(0, PREVIEW);
        const extra = c.provinces.length - PREVIEW;
        return (
          <div key={c.code} className={styles.country}>
            <button
              type="button"
              className={styles.row}
              data-open={isOpen}
              aria-expanded={isOpen}
              onClick={() => setOpen((o) => ({ ...o, [c.code]: !isOpen }))}
            >
              <Icon
                name="chevronRight"
                size={10}
                strokeWidth={3}
                stroke="rgba(0,0,0,0.45)"
                className={styles.chev ?? ''}
              />
              <img className={styles.flag} src={c.flagUrl} alt="" />
              <span className={styles.name}>{c.name}</span>
              <span className={styles.bar}>
                <span style={{ width: `${Math.round((c.total / max) * 100)}%` }} />
              </span>
              <b className={styles.count}>{fmtNumber(c.total)}</b>
            </button>
            {isOpen ? (
              <div className={styles.provs}>
                {shown.map((p) => (
                  <div key={p.name} className={styles.prov}>
                    <span className={styles.provName}>{p.name}</span>
                    <span className={styles.provBar}>
                      <span style={{ width: `${Math.round((p.count / pMax) * 100)}%` }} />
                    </span>
                    <span className={styles.provCount}>{fmtNumber(p.count)}</span>
                  </div>
                ))}
                {extra > 0 ? (
                  <button
                    type="button"
                    className={styles.more}
                    onClick={() => setFull((f) => ({ ...f, [c.code]: !isFull }))}
                  >
                    {isFull ? t('less') : t('more', { n: extra })}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
