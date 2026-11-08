'use client';

import { Button, DatePicker, Select } from 'antd';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useTranslations } from 'next-intl';
import { AUDIT_TAGS, type AuditLogFilters } from '@opchub/shared/api-domains';
import type { AuditLogFiltersProps } from '../types';
import styles from './audit-log.module.css';

dayjs.extend(utc);
dayjs.extend(timezone);
const ZONE = 'Asia/Ho_Chi_Minh';

export function AuditLogFiltersBar({
  filters,
  onChange,
  actors,
  failed,
  retry,
}: AuditLogFiltersProps) {
  const t = useTranslations('settings.log');
  return (
    <div className={styles.filters}>
      <Select
        aria-label={t('filterTag')}
        placeholder={t('filterTag')}
        allowClear
        value={filters.tag}
        options={AUDIT_TAGS.map((value) => ({ value, label: t(`tag.${value}`) }))}
        onChange={(tag: AuditLogFilters['tag']) => onChange({ ...filters, tag })}
      />
      <Select
        aria-label={t('filterActor')}
        placeholder={t('filterActor')}
        showSearch
        allowClear
        optionFilterProp="label"
        value={filters.actorId}
        options={[
          { value: 'system', label: t('system') },
          ...actors.map((a) => ({ value: a.id, label: a.name })),
        ]}
        onChange={(actorId: string | undefined) => onChange({ ...filters, actorId })}
      />
      <DatePicker.RangePicker
        aria-label={t('filterRange')}
        placeholder={[t('from'), t('to')]}
        value={
          filters.from && filters.to
            ? [dayjs(filters.from).tz(ZONE), dayjs(filters.to).tz(ZONE)]
            : null
        }
        disabledDate={(date) =>
          date.isBefore(dayjs().tz(ZONE).subtract(90, 'day'), 'day') ||
          date.isAfter(dayjs().tz(ZONE), 'day')
        }
        onChange={(dates) =>
          onChange({
            ...filters,
            from: dates?.[0]
              ? dayjs.tz(dates[0].format('YYYY-MM-DD'), ZONE).startOf('day').toISOString()
              : undefined,
            to: dates?.[1]
              ? dayjs.tz(dates[1].format('YYYY-MM-DD'), ZONE).endOf('day').toISOString()
              : undefined,
          })
        }
      />
      {Object.values(filters).some(Boolean) && (
        <Button onClick={() => onChange({})}>{t('clearFilters')}</Button>
      )}
      {failed && <Button onClick={retry}>{t('retryActors')}</Button>}
    </div>
  );
}
