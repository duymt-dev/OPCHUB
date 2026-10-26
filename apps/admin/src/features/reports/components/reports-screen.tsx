'use client';

import { reportFileName } from '@opchub/shared/api-domains';
import { ErrorState, PageHeader } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useCan } from '@/lib/permissions';
import { useReportFilter } from '../hooks/use-report-filter';
import { useReportExport, useReportPreview, useReportScopes } from '../hooks/use-reports';
import { toParams } from '../model';
import { ReportKpis, ReportMetricTable } from './report-metrics';
import { ReportGroupTable, ReportProvinceTable } from './report-rows';
import { ReportToolbar } from './report-toolbar';
import styles from './reports.module.css';

/**
 * V4-614 (D-78, REQ-516) Admin › Báo cáo: orchestrator — chọn mẫu / tháng / phạm vi, xem trước số
 * liệu "Thực hiện", "Xuất CSV" qua job export (đúng khuôn `docs/spec/mau-bao-cao`).
 */
export function ReportsScreen() {
  const t = useTranslations('reports');
  const scopes = useReportScopes();
  const { filter, months, setTemplate, setMonth, setScope } = useReportFilter(scopes.data);
  const params = toParams(filter);
  const preview = useReportPreview(params);
  const exp = useReportExport();
  const canView = useCan('reports.view');
  const data = preview.data?.template === filter.template ? preview.data : undefined;

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <div data-screen-label="Admin · Báo cáo" className={styles.wrap}>
        <ReportToolbar
          filter={filter}
          months={months}
          scopes={scopes.data}
          exporting={exp.isPending}
          canExport={canView && !!params && !!data}
          onTemplate={setTemplate}
          onMonth={setMonth}
          onScope={setScope}
          onExport={() => {
            if (!params || !data) return;
            exp.mutate({ params, file: reportFileName(params.template, params.month, data.scope) });
          }}
        />
        {preview.isError || scopes.isError ? (
          <ErrorState
            title={t('error')}
            retryLabel={t('retry')}
            onRetry={() => void (scopes.isError ? scopes.refetch() : preview.refetch())}
          />
        ) : (
          <>
            <ReportKpis template={filter.template} m={data?.metrics} />
            {data ? (
              <div className={styles.grid}>
                <ReportMetricTable template={data.template} m={data.metrics} />
                {data.template === 'b2' ? <ReportGroupTable rows={data.groups} /> : null}
                {data.template === 'b3' ? <ReportProvinceTable rows={data.provinces} /> : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
