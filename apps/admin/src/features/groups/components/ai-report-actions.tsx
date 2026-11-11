'use client';
import { Button, Space, Tag } from 'antd';
import { useLocale, useTranslations } from 'next-intl';
import { formatNumber } from '@/i18n/format';
import type { Report } from '@opchub/shared/api-domains';
import { useReportAction } from '../hooks/use-moderation';

export function AiReportActions({
  report,
  days,
  onLock,
}: {
  report: Report;
  days: number;
  onLock: (r: Report) => void;
}) {
  const t = useTranslations('groups.mod');
  const locale = useLocale();
  const action = useReportAction();
  return (
    <Space wrap>
      <Tag color="blue">{t('aiPending')}</Tag>
      <Button
        loading={action.isPending}
        onClick={() => action.mutate({ r: report, action: 'hide' })}
      >
        {t('aiHide')}
      </Button>
      <Button
        loading={action.isPending}
        onClick={() => action.mutate({ r: report, action: 'dismiss' })}
      >
        {t('aiDismiss')}
      </Button>
      {report.canLock ? (
        <Button danger onClick={() => onLock(report)}>
          {t('lockDays', { days: formatNumber(days, locale) })}
        </Button>
      ) : null}
    </Space>
  );
}
