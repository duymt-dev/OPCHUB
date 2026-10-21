import { useTranslations } from 'next-intl';
import type { GroupRef } from '../types';
import styles from './emergency-bar.module.css';

interface Props {
  groups: GroupRef[];
  scope: 'all' | 'groups';
  selected: string[];
  busy: boolean;
  onScope: (scope: 'all' | 'groups') => void;
  onSelected: (ids: string[]) => void;
}

export function HideScope({ groups, scope, selected, busy, onScope, onSelected }: Props) {
  const t = useTranslations('bots.emergency');
  return (
    <fieldset className={styles.scope} disabled={busy}>
      <legend>{t('scope')}</legend>
      {(['all', 'groups'] as const).map((value) => (
        <label key={value}>
          <input
            type="radio"
            name="bot-hide-scope"
            checked={scope === value}
            onChange={() => onScope(value)}
          />
          {t(value)}
        </label>
      ))}
      {scope === 'groups' && (
        <label>
          {t('chooseGroups')}
          <select
            multiple
            value={selected}
            onChange={(e) => onSelected(Array.from(e.target.selectedOptions, (o) => o.value))}
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </fieldset>
  );
}
