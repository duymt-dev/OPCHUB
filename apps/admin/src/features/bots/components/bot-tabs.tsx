'use client';

import type { BotScript, Persona } from '@opchub/shared/api-domains';
import { Tabs } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { useBotData } from '../hooks/use-bot-data';
import type { useBotActions } from '../hooks/use-bot-actions';
import { BOT_TABS, type BotTab } from '../types';
import { ActivityLog } from './activity-log';
import styles from './bots.module.css';
import { ConfirmDelete } from './confirm-delete';
import { PersonaList } from './persona-list';
import { ScriptList } from './script-list';
import { ThreadList } from './thread-list';

type Pending = { kind: 'persona'; item: Persona } | { kind: 'script'; item: BotScript } | null;

interface Props {
  tab: BotTab;
  data: ReturnType<typeof useBotData>;
  actions: ReturnType<typeof useBotActions>;
  onTab: (t: BotTab) => void;
  onOpen: (tab: 'persona' | 'script', id: string | null) => void;
}

/** Thanh 4 tab + nội dung tab; xoá persona/kịch bản qua hộp xác nhận */
export function BotTabs({ tab, data, actions, onTab, onOpen }: Props) {
  const t = useTranslations('bots');
  const [pending, setPending] = useState<Pending>(null);
  const confirm = () => {
    if (!pending) return;
    if (pending.kind === 'persona') actions.removePersona(pending.item.id);
    else actions.removeScript(pending.item.id);
    setPending(null);
  };

  return (
    <>
      <div className={styles.tabs}>
        <Tabs
          ariaLabel={t('tabs.aria')}
          idPrefix="bots"
          activeKey={tab}
          onChange={onTab}
          items={BOT_TABS.map((k) => ({ key: k, label: t(`tabs.${k}`) }))}
        />
      </div>
      <div
        role="tabpanel"
        className={styles.panel}
        id={`bots-panel-${tab}`}
        aria-labelledby={`bots-tab-${tab}`}
      >
        {tab === 'log' ? <ActivityLog items={data.activity?.items ?? []} now={data.now} /> : null}
        {tab === 'persona' ? (
          <PersonaList
            personas={data.personas}
            groupName={data.groupName}
            onNew={() => onOpen('persona', null)}
            onEdit={(p) => onOpen('persona', p.id)}
            onToggle={actions.togglePersona}
            onDelete={(p) => setPending({ kind: 'persona', item: p })}
          />
        ) : null}
        {tab === 'script' ? (
          <ScriptList
            scripts={data.scripts}
            personas={data.personas}
            threads={data.threads}
            groupName={data.groupName}
            busy={actions.busy}
            onNew={() => onOpen('script', null)}
            onRun={(s) => actions.run(s.id)}
            onEdit={(s) => onOpen('script', s.id)}
            onDelete={(s) => setPending({ kind: 'script', item: s })}
          />
        ) : null}
        {tab === 'queue' ? (
          <ThreadList
            threads={data.threads}
            now={data.now}
            busy={actions.busy}
            onStop={(th) => actions.stop(th.id)}
          />
        ) : null}
      </div>
      <ConfirmDelete
        target={
          pending
            ? pending.kind === 'persona'
              ? {
                  title: t('persona.confirmTitle'),
                  body: t('persona.confirmBody', { name: pending.item.name }),
                }
              : {
                  title: t('script.confirmTitle'),
                  body: t('script.confirmBody', { name: pending.item.topic }),
                }
            : null
        }
        onCancel={() => setPending(null)}
        onConfirm={confirm}
      />
    </>
  );
}
