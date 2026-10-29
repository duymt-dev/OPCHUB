'use client';

import { useState, type ComponentProps } from 'react';
import { useTranslations } from 'next-intl';
import type { GroupRef } from '../types';
import { ScriptList } from './script-list';
import { BulkModal } from './bulk/bulk-modal';
import s from './bulk/bulk.module.css';

type Props = ComponentProps<typeof ScriptList> & { groups: GroupRef[]; automaticTopics: string[] };
export function ScriptPanel({ groups, automaticTopics, ...list }: Props) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('bots.bulk');
  return (
    <>
      <ScriptList
        {...list}
        extra={
          <button type="button" className={s.outlined} onClick={() => setOpen(true)}>
            {t('open')}
          </button>
        }
      />
      {open ? (
        <BulkModal
          groups={groups}
          automaticTopics={automaticTopics}
          personas={list.personas}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
