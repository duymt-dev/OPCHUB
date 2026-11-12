'use client';

import type { Campaign } from '@opchub/shared/api-domains';
import { useLocale, useTranslations } from 'next-intl';
import { campaignCells, STATUS_TONE } from '../model';
import styles from './tables.module.css';

export interface CampaignActions {
  onSend: (c: Campaign) => void;
  onDuplicate: (c: Campaign) => void;
  /** BUG-036 "Dừng gửi" */
  onCancel: (c: Campaign) => void;
  onDelete: (c: Campaign) => void;
}

const HEAD = ['name', 'audience', 'recipients', 'open', 'click', 'at', 'status'] as const;

function Row({ c, act }: { c: Campaign; act: CampaignActions }) {
  const locale = useLocale();
  const t = useTranslations('marketing');
  const v = campaignCells(c, locale);
  return (
    <div className={`${styles.grid} ${styles.row}`} role="row">
      <div className={styles.name} role="cell">
        <b>{c.name}</b>
        <span className={styles.sub}>{c.subject}</span>
      </div>
      <span className={styles.muted} role="cell">
        {c.audienceLabel}
      </span>
      <span role="cell">{v.recipients}</span>
      <span role="cell">{v.open}</span>
      <span role="cell">{v.click}</span>
      <span className={styles.muted} role="cell">
        {v.at}
      </span>
      <div role="cell">
        <span className={`${styles.tag} ${styles[STATUS_TONE[c.status]]}`}>
          {t(`status.${c.status}`)}
        </span>
      </div>
      <div className={styles.actions} role="cell">
        {v.canSend ? (
          <button type="button" className={styles.link} onClick={() => act.onSend(c)}>
            {t('table.sendNow')}
          </button>
        ) : null}
        {v.canCancel ? (
          <button type="button" className={styles.danger} onClick={() => act.onCancel(c)}>
            {t('table.cancel')}
          </button>
        ) : null}
        <button type="button" className={styles.link} onClick={() => act.onDuplicate(c)}>
          {t('table.dup')}
        </button>
        <button
          type="button"
          className={styles.danger}
          disabled={!v.canDelete}
          onClick={() => act.onDelete(c)}
        >
          {t('table.del')}
        </button>
      </div>
    </div>
  );
}

/** D-78: bảng chiến dịch (cuộn ngang dưới 1060px như prototype) */
export function CampaignTable({ items, act }: { items: Campaign[]; act: CampaignActions }) {
  const t = useTranslations('marketing.table');
  return (
    <div data-m="tbl" className={styles.wrap}>
      <div className={styles.inner} role="table" aria-label={t('label')}>
        <div className={`${styles.grid} ${styles.th}`} role="row">
          {HEAD.map((k) => (
            <span key={k} role="columnheader">
              {t(k)}
            </span>
          ))}
          <span role="columnheader" aria-label={t('actions')} />
        </div>
        {items.map((c) => (
          <Row key={c.id} c={c} act={act} />
        ))}
        {items.length === 0 ? <div className={styles.sub}>{t('empty')}</div> : null}
      </div>
    </div>
  );
}
