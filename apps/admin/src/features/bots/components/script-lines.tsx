'use client';

import type { Persona } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { initialOf, lineKey, moveItem } from '../model';
import type { ScriptLineForm } from '../types';
import { PersonaAvatar } from './bits';
import f from './form.module.css';
import s from './script-drawer.module.css';

interface Props {
  lines: ScriptLineForm[];
  personas: Persona[];
  onChange: (lines: ScriptLineForm[]) => void;
}

/** Danh sách lượt: chọn persona, ↑ ↓ ×, nội dung, "+ Thêm lượt" */
export function ScriptLines({ lines, personas, onChange }: Props) {
  const t = useTranslations('bots.sf');
  const patch = (i: number, p: Partial<ScriptLineForm>) =>
    onChange(lines.map((l, j) => (j === i ? { ...l, ...p } : l)));
  return (
    <div className={s.block}>
      {t('lines')}
      {lines.map((l, i) => {
        const p = personas.find((x) => x.id === l.personaId);
        return (
          <div key={l.key} className={s.line}>
            <div className={s.lineHead}>
              <PersonaAvatar
                name={p?.name ?? '?'}
                initial={initialOf(p?.name ?? '?')}
                color={p?.color ?? '#999999'}
                photo={p?.avatarUrl ?? null}
                size={24}
              />
              <select
                className={f.select}
                aria-label={t('persona', { n: i + 1 })}
                value={l.personaId}
                onChange={(e) => patch(i, { personaId: e.target.value })}
              >
                {personas.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name} · {x.title}
                  </option>
                ))}
              </select>
              <MoveButtons
                onUp={() => onChange(moveItem(lines, i, -1))}
                onDown={() => onChange(moveItem(lines, i, 1))}
                onRemove={() => onChange(lines.filter((_, j) => j !== i))}
              />
            </div>
            <textarea
              className={f.textarea}
              rows={2}
              aria-label={t('text', { n: i + 1 })}
              placeholder={i === 0 ? t('first') : t('reply')}
              value={l.body}
              onChange={(e) => patch(i, { body: e.target.value })}
            />
          </div>
        );
      })}
      <button
        type="button"
        className={s.add}
        onClick={() =>
          onChange([...lines, { key: lineKey(), personaId: personas[0]?.id ?? '', body: '' }])
        }
      >
        {t('add')}
      </button>
    </div>
  );
}

interface MoveProps {
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}

/** ↑ ↓ × của một lượt */
function MoveButtons({ onUp, onDown, onRemove }: MoveProps) {
  const t = useTranslations('bots.sf');
  const items = [
    { k: 'up', ch: '↑', on: onUp, cls: s.icon },
    { k: 'down', ch: '↓', on: onDown, cls: s.icon },
    { k: 'remove', ch: '×', on: onRemove, cls: `${s.icon} ${s.iconX}` },
  ] as const;
  return (
    <>
      {items.map((b) => (
        <button
          key={b.k}
          type="button"
          className={b.cls}
          title={t(b.k)}
          aria-label={t(b.k)}
          onClick={b.on}
        >
          {b.ch}
        </button>
      ))}
    </>
  );
}
