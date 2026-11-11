import type { BotBulkBatch } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import s from './bulk.module.css';
import { useNumberText } from '@/i18n/use-number-text';

export function BulkHeading() {
  const t = useTranslations('bots.bulk');
  return (
    <div className={s.title}>
      <span className={s.titleIcon} aria-hidden="true">
        ✧
      </span>
      <div>
        <b>{t('title')}</b>
        <div className={s.subtitle}>{t('subtitle')}</div>
      </div>
    </div>
  );
}
export function BulkFooter({
  batch,
  disabled,
  busy,
  onClose,
  onSave,
}: {
  batch: BotBulkBatch | null;
  disabled: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: (id: string) => void;
}) {
  const numberText = useNumberText();
  const t = useTranslations('bots.bulk');
  const selected = Math.max(0, (batch?.selectedCount ?? 0) - (batch?.savedCount ?? 0));
  return (
    <>
      <span className={s.limits} title={t('limits')} aria-label={t('limits')}>
        {t('limitSummary')}
      </span>
      <button type="button" className={s.button} disabled={busy} onClick={onClose}>
        {t('cancel')}
      </button>
      {batch ? (
        <button
          type="button"
          className={s.primary}
          disabled={disabled || batch.status !== 'done' || selected < 1}
          onClick={() => onSave(batch.id)}
        >
          {t('save', { n: numberText(selected) })}
        </button>
      ) : null}
    </>
  );
}
