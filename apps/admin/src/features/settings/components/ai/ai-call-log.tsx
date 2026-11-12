'use client';
import { Alert, Button, Drawer, Table, Typography } from 'antd';
import { useLocale, useTranslations } from 'next-intl';
import { formatCurrency, formatNumber } from '@/i18n/format';
import { useAiCalls } from '../../hooks/use-ai-calls';
import { AiCallFilters } from './ai-call-filters';
import { useAiCallColumns } from './ai-call-columns';
import styles from './ai-call-log.module.css';

export function AiCallLog({
  open,
  close,
  logging,
}: {
  open: boolean;
  close: () => void;
  logging: boolean;
}) {
  const t = useTranslations('settings.aiCalls');
  const closeLabel = useTranslations('ui')('close');
  return (
    <Drawer
      title={t('title')}
      closable={{ 'aria-label': closeLabel }}
      open={open}
      onClose={close}
      size="large"
      destroyOnHidden
    >
      {open ? <AiCallLogBody logging={logging} /> : null}
    </Drawer>
  );
}
function AiCallLogBody({ logging }: { logging: boolean }) {
  const t = useTranslations('settings.aiCalls');
  const locale = useLocale();
  const columns = useAiCallColumns();
  const p = useAiCalls();
  const totals = p.totals;
  return (
    <div className={styles.body}>
      {!logging ? <Alert type="info" title={t('off')} /> : null}
      <AiCallFilters value={p.filters} onChange={p.update} />
      <Typography.Text>
        {totals
          ? t('totals', {
              calls: formatNumber(totals.calls, locale),
              prompt: formatNumber(totals.promptTokens, locale),
              completion: formatNumber(totals.completionTokens, locale),
              cost: formatCurrency(totals.cost, 'VND', locale),
            })
          : t('loadingTotals')}
      </Typography.Text>
      <Button
        loading={p.csv.isPending}
        disabled={!p.query.isSuccess}
        onClick={() => p.csv.mutate()}
      >
        {t('csv')}
      </Button>
      {p.query.isError ? (
        <Alert
          type="error"
          title={t('error')}
          action={<Button onClick={() => void p.query.refetch()}>{t('retry')}</Button>}
        />
      ) : null}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={p.rows}
        loading={p.query.isPending}
        pagination={false}
        scroll={{ x: 1300 }}
      />
      {p.query.hasNextPage ? (
        <Button loading={p.query.isFetchingNextPage} onClick={() => void p.query.fetchNextPage()}>
          {t('more')}
        </Button>
      ) : null}
    </div>
  );
}
