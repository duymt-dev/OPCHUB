import type { BotBulkItem, Persona } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { initialOf } from '../../model';
import { PersonaAvatar } from '../bits';
import s from './bulk.module.css';

export function BulkResultCard({
  item,
  personas,
  disabled,
  onSelect,
}: {
  item: BotBulkItem;
  personas: Map<string, Persona>;
  disabled: boolean;
  onSelect: (id: string, selected: boolean) => void;
}) {
  const t = useTranslations('bots.bulk');
  return (
    <div className={s.result}>
      <input
        type="checkbox"
        aria-label={t('selectItem', { n: item.ordinal + 1, topic: item.topic })}
        checked={item.selected}
        disabled={disabled || item.savedScriptId !== null}
        onChange={(event) => onSelect(item.id, event.target.checked)}
      />
      <div className={s.dialogue}>
        <b>
          {item.topic} <small>{t('turnCount', { n: item.lines.length })}</small>
        </b>
        {item.savedScriptId ? <span className={s.unique}>{t('saved')}</span> : null}
        {item.lines.map((line, index) => (
          <div className={s.line} key={`${item.id}-${index}`}>
            <b>{personas.get(line.personaId)?.name ?? t('unknownPersona')}</b>: {line.body}
          </div>
        ))}
      </div>
      <div className={s.avatars}>
        {item.lines.map((line, index) => {
          const persona = personas.get(line.personaId);
          const name = persona?.name ?? t('unknownPersona');
          return (
            <PersonaAvatar
              key={`${item.id}-${index}`}
              name={name}
              initial={initialOf(name)}
              color={persona?.color ?? '#999999'}
              photo={persona?.avatarUrl ?? null}
              size={20}
            />
          );
        })}
      </div>
    </div>
  );
}
