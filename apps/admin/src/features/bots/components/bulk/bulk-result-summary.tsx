import type { BotBulkItem } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { summarizeBulkResults } from '../../bulk/result-summary';
import s from './bulk.module.css';
import { useNumberText } from '@/i18n/use-number-text';

export function BulkResultSummary({ items, hasMore }: { items: BotBulkItem[]; hasMore: boolean }) {
  const numberText = useNumberText();
  const t = useTranslations('bots.bulk');
  const summary = summarizeBulkResults(items);
  return (
    <div className={s.resultSummary}>
      <span className={summary.duplicates ? s.duplicate : s.unique}>
        {t('lineSummary', {
          ...summary,
          total: numberText(summary.total),
          unique: numberText(summary.unique),
          duplicates: numberText(summary.duplicates),
        })}
      </span>
      {hasMore ? (
        <small className={s.hint}>{t('loadedSummary', { n: numberText(items.length) })}</small>
      ) : null}
    </div>
  );
}
