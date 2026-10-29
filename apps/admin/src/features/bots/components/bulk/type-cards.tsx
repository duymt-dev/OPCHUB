import type { BotConversationType } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import s from './types.module.css';

export function TypeCards({
  types,
  value,
  disabled,
  onChange,
  onDelete,
}: {
  types: BotConversationType[];
  value: string | undefined;
  disabled: boolean;
  onChange: (id: string) => void;
  onDelete: (type: BotConversationType) => void;
}) {
  const t = useTranslations('bots.bulk');
  return (
    <div className={s.grid} role="group" aria-label={t('type')}>
      {types.map((type) => (
        <div key={type.id} className={`${s.card} ${value === type.id ? s.selected : ''}`}>
          <button
            type="button"
            aria-label={type.name}
            aria-pressed={value === type.id}
            disabled={disabled}
            className={s.choice}
            onClick={() => onChange(type.id)}
          >
            <b>{type.name}</b>
            <span>{type.description}</span>
          </button>
          {type.custom ? (
            <button
              type="button"
              className={s.remove}
              aria-label={t('deleteTypeNamed', { name: type.name })}
              disabled={disabled}
              onClick={() => onDelete(type)}
            >
              ×
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
