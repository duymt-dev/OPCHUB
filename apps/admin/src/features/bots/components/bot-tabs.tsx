'use client';

import type { BotScript, Persona } from '@opchub/shared/api-domains';
import { Tabs } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import type { useBotData } from '../hooks/use-bot-data';
import type { useBotActions } from '../hooks/use-bot-actions';
import { BOT_TABS, type BotTab } from '../types';
import { ReplyPanel } from './reply-panel';
import { ActivityLog } from './activity-log';
import styles from './bots.module.css';
import { ConfirmDelete } from './confirm-delete';
import { PersonaList } from './persona-list';
import { ScriptPanel } from './script-panel';
import { ThreadList } from './thread-list';

type Pending = { kind: 'persona'; item: Persona } | { kind: 'script'; item: BotScript } | null;

interface Props {
  tab: BotTab;
  data: ReturnType<typeof useBotData>;
  actions: ReturnType<typeof useBotActions>;
  onTab: (t: BotTab) => void;
  onOpen: (tab: 'persona' | 'script', id: string | null) => void;
  /** REQ-141 nút khẩn cấp: đặt cuối hàng tab (prototype v4 không có hàng riêng — D-89) */
  extra?: ReactNode;
}

/** Thanh 5 tab + nội dung tab; xoá persona/kịch bản qua hộp xác nhận */
export function BotTabs({ tab, data, actions, onTab, onOpen, extra }: Props) {
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
        {extra}
      </div>
      <div
        role="tabpanel"
        className={styles.panel}
        id={`bots-panel-${tab}`}
        aria-labelledby={`bots-tab-${tab}`}
      >
        {tab === 'log' ? <ActivityLog items={data.activity?.items ?? []} now={data.now} /> : null}
        {tab === 'reply' ? <ReplyPanel groupCount={data.groups.length} /> : null}
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
          <ScriptPanel
            groups={data.groups}
            automaticTopics={data.settings?.topics ?? []}
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
      <BotDeletePrompt pending={pending} onCancel={() => setPending(null)} onConfirm={confirm} />
    </>
  );
}

function BotDeletePrompt({
  pending,
  onCancel,
  onConfirm,
}: {
  pending: Pending;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations('bots');
  const target = pending
    ? {
        title: t(`${pending.kind}.confirmTitle`),
        body: t(`${pending.kind}.confirmBody`, {
          name: pending.kind === 'persona' ? pending.item.name : pending.item.topic,
        }),
      }
    : null;
  return <ConfirmDelete target={target} onCancel={onCancel} onConfirm={onConfirm} />;
}
