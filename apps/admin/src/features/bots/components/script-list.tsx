'use client';

import type { BotScript, BotThread, Persona } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { initialOf } from '../model';
import { PersonaAvatar } from './bits';
import styles from './bots.module.css';
import c from './cards.module.css';

interface Props {
  scripts: BotScript[];
  personas: Persona[];
  threads: BotThread[];
  groupName: (id: string) => string;
  busy: boolean;
  onNew: () => void;
  onRun: (s: BotScript) => void;
  onEdit: (s: BotScript) => void;
  onDelete: (s: BotScript) => void;
}

const fmtAt = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  });

/** D-39 tab Kịch bản hội thoại: thẻ, avatar persona, Chạy ngay / Sửa / Xóa */
export function ScriptList(p: Props) {
  const t = useTranslations('bots.script');
  const personaOf = (id: string) => p.personas.find((x) => x.id === id);
  return (
    <>
      <div className={styles.toolbar}>
        <button type="button" className={styles.primary} onClick={p.onNew}>
          {t('new')}
        </button>
      </div>
      {p.scripts.length ? null : <div className={styles.empty}>{t('empty')}</div>}
      <div className={`${c.grid} ${c.gridWide}`}>
        {p.scripts.map((s) => {
          const ids = [...new Set(s.lines.map((l) => l.personaId))];
          const runs = p.threads.filter((x) => x.scriptId === s.id).length;
          return (
            <div key={s.id} className={`${c.card} ${c.cardScript}`}>
              <div className={c.scriptHead}>
                <span className={`${c.tag} ${c.tagViolet}`}>{s.type}</span>
                <span className={c.spacer} />
                <span className={c.runs}>{t('runs', { n: runs })}</span>
              </div>
              <b className={c.topic}>{s.topic}</b>
              <span className={c.quote}>“{s.lines[0]?.body ?? ''}”</span>
              <div className={c.avs}>
                <div className={c.stack}>
                  {ids.map((id) => {
                    const ps = personaOf(id);
                    const name = ps?.name ?? '?';
                    return (
                      <span key={id} className={c.stackItem} title={name}>
                        <PersonaAvatar
                          name={name}
                          initial={initialOf(name)}
                          color={ps?.color ?? '#999999'}
                          photo={ps?.avatarUrl ?? null}
                          size={26}
                        />
                      </span>
                    );
                  })}
                </div>
                <span className={c.avsLabel}>{t('lines', { n: s.lines.length })}</span>
              </div>
              <div className={c.meta}>
                <span>{t('groups', { names: s.groupIds.map(p.groupName).join(', ') })}</span>
                <span>
                  {s.runAt ? t('scheduled', { at: fmtAt(s.runAt) }) : t('manual')} ·{' '}
                  {t('delay', { n: s.delayMinutes })}
                </span>
              </div>
              <div className={`${c.actions} ${c.actionsScript}`}>
                <button
                  type="button"
                  className={c.btnPrimary}
                  disabled={p.busy}
                  onClick={() => p.onRun(s)}
                >
                  {t('run')}
                </button>
                <button type="button" className={c.btn} onClick={() => p.onEdit(s)}>
                  {t('edit')}
                </button>
                <span className={c.spacer} />
                <button type="button" className={c.danger} onClick={() => p.onDelete(s)}>
                  {t('delete')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
