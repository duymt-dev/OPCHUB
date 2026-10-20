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
  const disabled = !action.allowed || action.busy || blocked;
  const close = () => {
    if (!action.busy) setTarget(null);
  };
  return (
    <section className={styles.bar} aria-label={t('title')}>
      <button
        type="button"
        className={`${c.btn} ${c.btnDanger}`}
        disabled={disabled}
        onClick={() => setTarget('stop')}
      >
        {t('stop')}
      </button>
      <button type="button" className={c.btn} disabled={disabled} onClick={() => setTarget('hide')}>
        {t('hide')}
      </button>
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
