import type { BotBulkBatch } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import s from './bulk.module.css';
import { useNumberText } from '@/i18n/use-number-text';

export function BulkProgress({
  batch,
  disabled,
  onRetry,
}: {
  batch: BotBulkBatch;
  disabled: boolean;
  onRetry: () => void;
}) {
  const numberText = useNumberText();
  const t = useTranslations('bots.bulk');
  return (
    <div
      className={batch.status === 'done' ? s.completedProgress : s.progress}
      role="status"
      aria-live="polite"
    >
      <b>
        {t(`status.${batch.status}`)} · {numberText(batch.cursor)}/{numberText(batch.total)}
      </b>
      <span className={s.hint}>
        {batch.typeName} · {t('savedCount', { n: numberText(batch.savedCount) })}
      </span>
      {batch.status === 'running' ? <span className={s.hint}>{t('recoverHint')}</span> : null}
      {batch.error ? <span className={s.error}>{t(`failure.${batch.error}`)}</span> : null}
      {batch.status === 'failed' ? (
        <button type="button" className={s.link} disabled={disabled} onClick={onRetry}>
          {t('retry')}
        </button>
      ) : null}
    </div>
  );
}
