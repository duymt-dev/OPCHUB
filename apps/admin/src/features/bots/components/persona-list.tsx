'use client';

import type { Persona } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { initialOf, splitTags } from '../model';
import { PersonaAvatar, Switch } from './bits';
import styles from './bots.module.css';
import c from './cards.module.css';
import { useNumberText } from '@/i18n/use-number-text';
import { useBotOptionLabels } from '../option-labels';

interface Props {
  personas: Persona[];
  groupName: (id: string) => string;
  onNew: () => void;
  onEdit: (p: Persona) => void;
  onToggle: (p: Persona) => void;
  onDelete: (p: Persona) => void;
}

/** D-37 tab Persona: thẻ có công tắc, giọng văn, chuyên môn, số liệu, Sửa / Xóa */
export function PersonaList({ personas, groupName, onNew, onEdit, onToggle, onDelete }: Props) {
  const numberText = useNumberText();
  const options = useBotOptionLabels();
  const t = useTranslations('bots.persona');
  return (
    <>
      <div className={styles.toolbar}>
        <button type="button" className={styles.primary} onClick={onNew}>
          {t('new')}
        </button>
      </div>
      {personas.length ? null : <div className={styles.empty}>{t('empty')}</div>}
      <div className={c.grid}>
        {personas.map((p) => (
          <div key={p.id} className={c.card}>
            <div className={c.who}>
              <PersonaAvatar
                name={p.name}
                initial={initialOf(p.name)}
                color={p.color}
                photo={p.avatarUrl}
                size={48}
              />
              <div className={c.whoText}>
                <b className={c.name}>{p.name}</b>
                <span className={c.muted}>
                  {p.title} · {p.province}
                </span>
              </div>
              <Switch
                on={p.enabled}
                label={t('toggle', { name: p.name })}
                onChange={() => onToggle(p)}
              />
            </div>
            {p.bio ? <span className={c.bio}>{p.bio}</span> : null}
            <div className={c.tags}>
              <span className={c.tag}>{options.tone(p.tone)}</span>
              {splitTags(p.skills).map((s) => (
                <span key={s} className={`${c.tag} ${c.tagBlue}`}>
                  {s}
                </span>
              ))}
            </div>
            <div className={c.metrics}>
              <div className={c.metric}>
                <b>{numberText(p.postCount)}</b>
                <span>{t('posts')}</span>
              </div>
              <div className={c.metric}>
                <b>{t('freqValue', { n: numberText(p.postsPerDay) })}</b>
                <span>{t('freq')}</span>
              </div>
              <div className={c.metric}>
                <b>{options.activeHour(p.activeHours)}</b>
                <span>{t('hours')}</span>
              </div>
            </div>
            <span className={c.muted}>
              {t('groups', { names: p.groupIds.map(groupName).join(', ') })}
            </span>
            <div className={c.actions}>
              <button type="button" className={c.link} onClick={() => onEdit(p)}>
                {t('edit')}
              </button>
              <button type="button" className={c.danger} onClick={() => onDelete(p)}>
                {t('delete')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
