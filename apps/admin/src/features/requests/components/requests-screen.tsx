'use client';

import { ConfirmDialog, type ConfirmRequest } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRequestActions } from '../hooks/use-request-actions';
import { useRequestRoute } from '../hooks/use-request-route';
import { useRequests } from '../hooks/use-requests';
import { CatalogTab } from './catalog-tab';
import { RequestDrawer } from './request-drawer';
import { RequestListTab } from './request-list-tab';
import { RequestsHeader, ScreenTabs } from './screen-tabs';
import styles from './requests.module.css';

/** D-61 → D-65 Dịch vụ: orchestrator — tab (URL), thống kê, lọc, bảng, drawer, danh mục */
export function RequestsScreen() {
  const t = useTranslations('requests');
  const { tab, setTab, params, update, code: openCode, setCode } = useRequestRoute();
  const { list, summary, catalog } = useRequests(params);
  const act = useRequestActions();
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const close = useCallback(() => setCode(null), [setCode]);
  const closeConfirm = useCallback(() => setConfirm(null), []);

  const rows = list.data?.items ?? [];
  const services = useMemo(
    () => new Map((catalog.data ?? []).map((s) => [s.id, s])),
    [catalog.data],
  );
  const open = rows.find((r) => r.code === openCode) ?? null;
  // BUG-023: phiếu trên URL không có ở trang hiện tại → tìm theo mã (không có API chi tiết theo mã)
  const settled = list.isSuccess && !list.isPlaceholderData;
  useEffect(() => {
    if (tab === 'list' && openCode && settled && !open && params.q !== openCode) {
      update({ q: openCode, status: 'all', page: 1 });
    }
  }, [tab, openCode, settled, open, params.q, update]);
  const counts = { list: summary.data?.total, catalog: catalog.data?.length };

  return (
    <>
      <RequestsHeader />
      <div data-screen-label="Admin · Yêu cầu dịch vụ" className={styles.wrap}>
        <ScreenTabs tab={tab} counts={counts} onTab={setTab} />
        {tab === 'list' ? (
          <RequestListTab
            params={params}
            update={update}
            list={list}
            summary={summary.data}
            services={services}
            onOpen={setCode}
            onCsv={act.exportCsv}
          />
        ) : (
          <CatalogTab rows={catalog.data ?? []} confirm={setConfirm} />
        )}
      </div>
      {open ? (
        <RequestDrawer
          r={open}
          svc={services.get(open.serviceId)}
          onClose={close}
          onMove={(to) => act.move(open, to)}
          onAssign={(who) => act.assign(open.code, who)}
          onReject={() =>
            setConfirm({
              title: t('confirm.rejectTitle', { code: open.code }),
              body: t('confirm.rejectBody', { name: open.fullName }),
              okLabel: t('confirm.reject'),
              cancelLabel: t('confirm.cancel'),
              danger: true,
              onOk: () => act.move(open, 'lost'),
            })
          }
        />
      ) : null}
      <ConfirmDialog req={confirm} onClose={closeConfirm} />
    </>
  );
}
