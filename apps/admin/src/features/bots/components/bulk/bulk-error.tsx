import { useTranslations } from 'next-intl';
import { messageOf } from '@/lib/api-errors';
import s from './bulk.module.css';

export function BulkError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const t = useTranslations('bots.bulk');
  if (!error) return null;
  return (
    <div role="alert" className={s.error}>
      {messageOf(error, t('error'))}
      {onRetry ? (
        <button type="button" className={s.link} onClick={onRetry}>
          {t('reload')}
        </button>
      ) : null}
    </div>
  );
}
