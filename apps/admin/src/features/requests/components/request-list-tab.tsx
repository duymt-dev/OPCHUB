'use client';

import type {
  AdminService,
  ServiceRequest,
  ServiceRequestSummary,
} from '@opchub/shared/api-domains';
import { ErrorState, Pagination } from '@opchub/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { REQUEST_PAGE_SIZES, type RequestParams } from '../types';
import { RequestTable } from './request-table';
import { RequestStats, RequestToolbar } from './request-toolbar';
import styles from './requests.module.css';

interface Props {
  params: RequestParams;
  update: (p: Partial<RequestParams>) => void;
  list: UseQueryResult<{ items: ServiceRequest[]; total: number }>;
  summary: ServiceRequestSummary | undefined;
  services: Map<string, AdminService>;
  onOpen: (code: string) => void;
  onCsv: () => void;
}

/** Tab "Yêu cầu đăng ký": thống kê, lọc + tìm (URL), bảng, phân trang */
export function RequestListTab({ params, update, list, summary, services, onOpen, onCsv }: Props) {
  const t = useTranslations('requests');
  const rows = list.data?.items ?? [];
  return (
    <>
      <RequestStats s={summary} />
      <div className={styles.card}>
        <RequestToolbar
          q={params.q}
          status={params.status}
          summary={summary}
          onSearch={(q) => update({ q, page: 1 })}
          onStatus={(status) => update({ status, page: 1 })}
          onCsv={onCsv}
        />
        {list.isError ? (
          <ErrorState
            title={t('error')}
            retryLabel={t('retry')}
            onRetry={() => void list.refetch()}
          />
        ) : (
          <RequestTable rows={rows} services={services} onOpen={(r) => onOpen(r.code)} />
        )}
        {list.isSuccess && rows.length === 0 ? (
          <div className={styles.empty}>{t('empty')}</div>
        ) : null}
        <Pagination
          page={params.page}
          size={params.size}
          total={list.data?.total ?? 0}
          sizeOptions={[...REQUEST_PAGE_SIZES]}
          onChange={(page) => update({ page })}
          onSizeChange={(size) => update({ size, page: 1 })}
          labels={{
            unit: t('pager.unit'),
            prev: t('pager.prev'),
            next: t('pager.next'),
            pageSize: t('pager.pageSize'),
          }}
        />
      </div>
    </>
  );
}
