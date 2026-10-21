'use client';

import { Modal } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { BotEmergencyAction, GroupRef } from '../types';
import c from './cards.module.css';
import { HideScope } from './hide-scope';

interface Props {
  target: 'stop' | 'hide';
  groups: GroupRef[];
  busy: boolean;
  disabled: boolean;
  onClose: () => void;
  onConfirm: (action: BotEmergencyAction) => Promise<void>;
}

export function EmergencyConfirm({ target, groups, busy, disabled, onClose, onConfirm }: Props) {
  const t = useTranslations('bots.emergency');
  const [scope, setScope] = useState<'all' | 'groups'>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const invalid = target === 'hide' && scope === 'groups' && !selected.length;
  const confirm = () => {
    if (disabled || invalid) return;
    void onConfirm(
      target === 'stop'
        ? { kind: 'stop' }
        : {
            kind: 'hide',
            ...(scope === 'groups' ? { groupIds: selected } : {}),
          },
    );
  };
  return (
    <Modal
      open
      title={t(target)}
      closeLabel={t('close')}
      onClose={onClose}
      dismissible={!busy}
      size="small"
      footer={
        <>
          <button type="button" className={c.btn} disabled={busy} onClick={onClose}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className={`${c.btnPrimary} ${c.btnDanger}`}
            disabled={disabled || invalid}
            onClick={confirm}
          >
            {busy ? t('pending') : t('confirm')}
          </button>
        </>
      }
    >
      <p>{t(target === 'stop' ? 'stopWarning' : 'hideWarning')}</p>
      {target === 'hide' && (
        <HideScope
          groups={groups}
          scope={scope}
          selected={selected}
          busy={busy}
          onScope={setScope}
          onSelected={setSelected}
        />
      )}
    </Modal>
  );
}
