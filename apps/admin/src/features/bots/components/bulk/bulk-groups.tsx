import { useTranslations } from 'next-intl';
import type { GroupRef } from '../../types';
import s from './bulk.module.css';

interface Props {
  groups: GroupRef[];
  value?: string[];
  onChange?: (value: string[]) => void;
  disabled?: boolean;
}
export function BulkGroups({ groups, value = [], onChange, disabled }: Props) {
  const t = useTranslations('bots.bulk');
  const toggle = (id: string) =>
    onChange?.(value.includes(id) ? value.filter((key) => key !== id) : [...value, id]);
  return (
    <div>
      <div className={`${s.labelRow} ${s.groupRow}`}>
        <span className={s.groupLabel}>
          <span>{t('groups')}</span>
          <small>{t('groupsHint')}</small>
        </span>
        <button
          type="button"
          disabled={disabled}
          className={s.link}
          onClick={() => onChange?.(groups.map((group) => group.id))}
        >
          {t('allGroups')}
        </button>
      </div>
      <div className={s.groups} role="group" aria-label={t('groups')}>
        {groups.map((group) => (
          <button
            type="button"
            key={group.id}
            disabled={disabled}
            className={`${s.chip} ${value.includes(group.id) ? s.chosenGroup : ''}`}
            aria-pressed={value.includes(group.id)}
            onClick={() => toggle(group.id)}
          >
            {group.name}
          </button>
        ))}
        {!groups.length ? <span className={s.hint}>{t('noGroups')}</span> : null}
      </div>
    </div>
  );
}
