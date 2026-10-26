'use client';

import type { StoreStatus, StoreUpsert } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { completeness, storeInitials } from '../model';
import styles from './mine.module.css';
import base from './stores.module.css';

interface Props {
  draft: StoreUpsert;
  status: StoreStatus;
  busy: boolean;
  onPublish: () => void;
  onSave: () => void;
  onView: () => void;
  onUnpublish: () => void;
}

/** Cột phải: thẻ xem trước + "Mức độ hoàn thiện" 5 mục + Xuất bản / Lưu / Xem / Gỡ xuống */
export function MineSide({ draft, status, busy, ...on }: Props) {
  const t = useTranslations('stores.mine');
  const { checks, pct } = completeness(draft);
  const loc = [draft.field, draft.province].filter(Boolean).join(' · ');
  return (
    <div className={styles.side}>
      <section className={`${base.card} ${styles.preview}`}>
        <div
          className={styles.previewCover}
          style={draft.coverUrl ? { backgroundImage: `url('${draft.coverUrl}')` } : undefined}
        />
        <div className={styles.previewBody}>
          <div className={styles.previewIni}>{storeInitials(draft.name)}</div>
          <span className={styles.previewName}>{draft.name}</span>
          <span className={styles.previewLoc}>{loc}</span>
          <span className={styles.previewSlogan}>{draft.slogan}</span>
        </div>
      </section>
      <section className={`${base.card} ${styles.progress}`}>
        <div className={styles.pctRow}>
          <span>{t('completeness')}</span>
          <b>{pct}%</b>
        </div>
        <div className={styles.bar}>
          <div className={styles.barFill} style={{ width: `${pct}%` }} />
        </div>
        {checks.map(([k, ok]) => (
          <div key={k} className={`${styles.check} ${ok ? styles.checkOk : ''}`}>
            <span className={styles.checkDot}>{ok ? '✓' : ''}</span>
            {t(`check.${k}`)}
          </div>
        ))}
        <div className={styles.sideBtns}>
          <button
            type="button"
            className={`${base.btn} ${base.btnPrimary} ${styles.publish}`}
            disabled={busy}
            onClick={on.onPublish}
          >
            {t('publish')}
          </button>
          <div className={styles.btnRow}>
            <button type="button" className={base.btn} disabled={busy} onClick={on.onSave}>
              {t('save')}
            </button>
            {status === 'published' ? (
              <>
                <button type="button" className={base.btn} onClick={on.onView}>
                  {t('view')}
                </button>
                <button type="button" className={base.btn} disabled={busy} onClick={on.onUnpublish}>
                  {t('unpublish')}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
