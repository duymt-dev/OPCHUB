import type { BotBulkItem, Persona } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { BulkResultCard } from './bulk-result-card';
import s from './bulk.module.css';

interface Props {
  items: BotBulkItem[];
  personas: Persona[];
  disabled: boolean;
  hasMore: boolean;
  fetching: boolean;
  onMore: () => void;
  onSelect: (id: string, selected: boolean) => void;
}
export function BulkResults(p: Props) {
  const t = useTranslations('bots.bulk');
  const names = new Map(p.personas.map((persona) => [persona.id, persona]));
  if (!p.items.length) return null;
  return (
    <section className={s.results} aria-label={t('results')}>
      <div className={s.resultsHeading}>
        <b>{t('results')}</b>
        <span className={s.unique}>{t('unique')}</span>
      </div>
      {p.items.map((item) => (
        <BulkResultCard
          key={item.id}
          item={item}
          personas={names}
          disabled={p.disabled}
          onSelect={p.onSelect}
        />
      ))}
      {p.hasMore ? (
        <button type="button" className={s.link} disabled={p.fetching} onClick={p.onMore}>
          {t('moreResults')}
        </button>
      ) : null}
    </section>
  );
}
