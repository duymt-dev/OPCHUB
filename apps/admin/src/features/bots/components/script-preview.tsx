'use client';

import type { Persona } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { initialOf } from '../model';
import type { ScriptLineForm } from '../types';
import { PersonaAvatar } from './bits';
import s from './script-drawer.module.css';

/** "XEM TRƯỚC TRONG NHÓM CHAT" — các lượt đã có nội dung */
export function ScriptPreview({
  lines,
  personas,
}: {
  lines: ScriptLineForm[];
  personas: Persona[];
}) {
  const t = useTranslations('bots.sf');
  const filled = lines.filter((l) => l.body.trim());
  return (
    <div className={s.preview}>
      <span className={s.previewTitle}>{t('preview')}</span>
      {filled.length ? null : <span className={s.previewEmpty}>{t('previewEmpty')}</span>}
      {filled.map((l) => {
        const p = personas.find((x) => x.id === l.personaId);
        const name = p?.name ?? '?';
        return (
          <div key={l.key} className={s.msg}>
            <PersonaAvatar
              name={name}
              initial={initialOf(name)}
              color={p?.color ?? '#999999'}
              photo={p?.avatarUrl ?? null}
              size={30}
            />
            <div className={s.msgText}>
              <span className={s.msgName}>{name}</span>
              <div className={s.bubble}>{l.body}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
