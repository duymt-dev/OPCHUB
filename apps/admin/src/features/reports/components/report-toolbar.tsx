'use client';

import {
  REPORT_REGION_LABEL,
  REPORT_REGIONS,
  REPORT_TEMPLATES,
  type ReportScopes,
  type ReportTemplate,
} from '@opchub/shared/api-domains';
import { Button, Segmented, Select } from 'antd';
import { useTranslations } from 'next-intl';
import { monthLabel } from '../model';
import type { ReportFilter } from '../types';
import styles from './reports.module.css';

interface Props {
  filter: ReportFilter;
  months: readonly string[];
  scopes: ReportScopes | undefined;
  exporting: boolean;
  canExport: boolean;
  onTemplate: (t: ReportTemplate) => void;
  onMonth: (m: string) => void;
  onScope: (s: string) => void;
  onExport: () => void;
}

function scopeOptions(template: ReportTemplate, scopes: ReportScopes | undefined) {
  if (template === 'b3')
    return REPORT_REGIONS.map((r) => ({ value: r, label: REPORT_REGION_LABEL[r] }));
  if (!scopes) return [];
  return template === 'b1'
    ? scopes.groups.map((g) => ({ value: g.id, label: `${g.name} · ${g.province}` }))
    : scopes.provinces.map((p) => ({ value: p.name, label: p.name }));
}

/** Thanh lọc: mẫu (segmented) · tháng · phạm vi theo mẫu · "Xuất CSV" */
export function ReportToolbar(p: Props) {
  const t = useTranslations('reports');
  return (
    <div className={styles.toolbar}>
      <Segmented
        aria-label={t('template.label')}
        value={p.filter.template}
        options={REPORT_TEMPLATES.map((v) => ({ value: v, label: t(`template.${v}`) }))}
        onChange={p.onTemplate}
      />
      <label className={styles.field}>
        {t('month')}
        <Select
          aria-label={t('month')}
          className={styles.month ?? ''}
          value={p.filter.month}
          options={p.months.map((m) => ({
            value: m,
            label: t('monthOption', { month: monthLabel(m) }),
          }))}
          onChange={p.onMonth}
        />
      </label>
      <label className={styles.field}>
        {t(`scope.${p.filter.template}`)}
        <Select
          aria-label={t(`scope.${p.filter.template}`)}
          className={styles.scope ?? ''}
          showSearch={{ optionFilterProp: 'label' }}
          value={p.filter.scope || null}
          placeholder={t('pickScope')}
          options={scopeOptions(p.filter.template, p.scopes)}
          onChange={p.onScope}
        />
      </label>
      <Button
        type="primary"
        className={styles.export ?? ''}
        loading={p.exporting}
        disabled={!p.canExport}
        onClick={p.onExport}
      >
        {t('export')}
      </Button>
    </div>
  );
}
