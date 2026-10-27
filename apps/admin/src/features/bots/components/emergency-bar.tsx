'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useBotEmergency } from '../hooks/use-bot-emergency';
import type { GroupRef } from '../types';
import c from './cards.module.css';
import { EmergencyConfirm } from './emergency-confirm';
import styles from './emergency-bar.module.css';

interface Props {
  groups: GroupRef[];
  blocked: boolean;
}

/** REQ-141: explicit scope, destructive confirmation, permission and pending guards. */
export function EmergencyBar({ groups, blocked }: Props) {
  const t = useTranslations('bots.emergency');
  const action = useBotEmergency();
  const [target, setTarget] = useState<'stop' | 'hide' | null>(null);
  // D-91 (4): ≤ 767px thanh thu vào nút ⋯ ở góc thẻ (prototype v4 không có hàng này)
  const [menu, setMenu] = useState(false);
  const pick = (next: 'stop' | 'hide') => {
    setMenu(false);
    setTarget(next);
  };
  const disabled = !action.allowed || action.busy || blocked;
  const close = () => {
    if (!action.busy) setTarget(null);
  };
  return (
    <section className={styles.bar} aria-label={t('title')} data-open={menu ? '1' : '0'}>
      <button
        type="button"
        className={styles.more}
        aria-label={t('more')}
        aria-expanded={menu}
        aria-controls="bot-emergency-actions"
        onClick={() => setMenu((v) => !v)}
      >
        ⋯
      </button>
      <div id="bot-emergency-actions" className={styles.actions}>
        <button
          type="button"
          className={`${c.btn} ${c.btnDanger}`}
          disabled={disabled}
          onClick={() => pick('stop')}
        >
          {t('stop')}
        </button>
        <button type="button" className={c.btn} disabled={disabled} onClick={() => pick('hide')}>
          {t('hide')}
        </button>
      </div>
      {target && (
        <EmergencyConfirm
          target={target}
          groups={groups}
          busy={action.busy}
          disabled={disabled}
          onClose={close}
          onConfirm={async (request) => {
            if (!disabled && (await action.execute(request))) setTarget(null);
          }}
        />
      )}
    </section>
  );
}
