import type { BotBulkItem } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { summarizeBulkResults } from '../../bulk/result-summary';
import s from './bulk.module.css';

export function BulkResultSummary({ items, hasMore }: { items: BotBulkItem[]; hasMore: boolean }) {
  const t = useTranslations('bots.bulk');
  const summary = summarizeBulkResults(items);
  return (
    <div className={s.resultSummary}>
      <span className={summary.duplicates ? s.duplicate : s.unique}>
        {t('lineSummary', summary)}
      </span>
      {hasMore ? <small className={s.hint}>{t('loadedSummary', { n: items.length })}</small> : null}
    </div>
  );
}
