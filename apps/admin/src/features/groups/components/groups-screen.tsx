'use client';

import { ErrorState, Icon, PageHeader, PageSkeleton, Tabs } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useGroupDelete } from '../hooks/use-group-delete';
import { useAdminGroups } from '../hooks/use-groups';
import { useGroupsParams } from '../hooks/use-groups-params';
import { useOpenReports } from '../hooks/use-moderation';
import type { GroupTab } from '../types';
import { ConfirmDialog } from './confirm-dialog';
import { ExportModal } from './export-modal';
import { GroupForm } from './group-form';
import { GroupListPanel } from './group-list-panel';
import styles from './groups.module.css';
import { ModerationPanel } from './moderation-panel';

function GroupsHeader() {
  const t = useTranslations('groups');
  return (
    <PageHeader
      title={t('title')}
      subtitle={t('sub')}
      extra={
        <div className={styles.dateRange}>
          <Icon name="calendar" stroke="rgba(0,0,0,0.65)" />
          {t('dateRange')}
          <Icon name="chevronDown" size={14} stroke="rgba(0,0,0,0.45)" />
        </div>
      }
    />
  );
}

/** D-23 → D-35: Admin "Nhóm cộng đồng" (orchestrator) */
export function GroupsScreen() {
  const t = useTranslations('groups');
  const router = useRouter();
  const { params, update } = useGroupsParams();
  const groups = useAdminGroups();
  const reports = useOpenReports();
  const del = useGroupDelete();
  const [form, setForm] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string[] | null>(null);

  let body;
  if (params.tab === 'mod')
    body = (
      <ModerationPanel
        filter={params.rep}
        onFilter={(rep) => update({ rep })}
        onConfirm={del.setConfirm}
      />
    );
  else if (groups.isError)
    body = (
      <ErrorState
        title={t('list.loadError')}
        retryLabel={t('list.retry')}
        onRetry={() => void groups.refetch()}
      />
    );
  else if (!groups.data) body = <PageSkeleton />;
  else
    body = (
      <GroupListPanel
        all={groups.data}
        params={params}
        onChange={update}
        onCreate={() => setForm('new')}
        onExport={setExporting}
        onDeleteMany={del.remove}
        actions={{
          onEdit: (g) => setForm(g.id),
          onExport: (g) => setExporting([g.id]),
          onChat: (g) => router.push(`/groups/${encodeURIComponent(g.id)}/chat`),
          onDelete: (g) => del.remove([g]),
        }}
      />
    );

  return (
    <>
      <GroupsHeader />
      <div className={styles.tabs}>
        <Tabs<GroupTab>
          variant="admin"
          ariaLabel={t('tabs.label')}
          activeKey={params.tab}
          onChange={(tab) => update({ tab })}
          items={[
            { key: 'list', label: <span>{t('tabs.list')}</span> },
            // nhãn bọc span để tìm được theo chữ chính xác (số đếm là phần tử riêng)
            { key: 'mod', label: <span>{t('tabs.mod')}</span>, count: reports.data?.length ?? 0 },
          ]}
        />
      </div>
      {body}
      <GroupForm target={form} all={groups.data ?? []} onClose={() => setForm(null)} />
      <ExportModal
        target={exporting}
        groups={groups.data ?? []}
        onClose={() => setExporting(null)}
      />
      <ConfirmDialog req={del.confirm} busy={del.busy} onClose={() => del.setConfirm(null)} />
    </>
  );
}
