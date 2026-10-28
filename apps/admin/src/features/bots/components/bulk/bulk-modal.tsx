'use client';

import { Modal } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useBotBulk } from '../../hooks/use-bot-bulk';
import { useBotBulkActions } from '../../hooks/use-bot-bulk-actions';
import type { BulkModalProps } from '../../bulk/types';
import { BulkHeading, BulkFooter } from './bulk-modal-frame';
import { BulkForm } from './bulk-form';
import { BulkError } from './bulk-error';
import { BulkProgress } from './bulk-progress';
import { BulkResults } from './bulk-results';
import s from './bulk.module.css';

export function BulkModal({ groups, personas, automaticTopics, onClose }: BulkModalProps) {
  const t = useTranslations('bots.bulk');
  const data = useBotBulk();
  const actions = useBotBulkActions();
  const batch = data.batch;
  const disabled = !actions.allowed || actions.busy || data.latest.isPending || data.latest.isError;
  return (
    <Modal
      open
      size="wide"
      className={s.modal ?? ''}
      closeLabel={t('close')}
      onClose={onClose}
      dismissible={!actions.busy}
      title={<BulkHeading />}
      footer={
        <BulkFooter
          batch={batch}
          disabled={disabled}
          busy={actions.busy}
          onClose={onClose}
          onSave={(id) => void actions.save(id)}
        />
      }
    >
      {!actions.allowed ? (
        <div role="status" className={s.hint}>
          {t('readOnly')}
        </div>
      ) : null}
      {data.latest.isPending ? <div role="status">{t('loading')}</div> : null}
      <BulkError error={data.latest.error} onRetry={() => void data.latest.refetch()} />
      <BulkForm
        groups={groups}
        automaticTopics={automaticTopics}
        disabled={disabled || batch?.status === 'running'}
        error={actions.error}
        create={actions.create}
      />
      <BulkError error={actions.error} />
      {batch ? (
        <BulkProgress
          batch={batch}
          disabled={disabled}
          onRetry={() => void actions.retry(batch.id)}
        />
      ) : null}
      <BulkError error={data.items.error} onRetry={() => void data.items.refetch()} />
      <BulkResults
        items={data.results}
        personas={personas}
        disabled={disabled}
        hasMore={data.items.hasNextPage}
        fetching={data.items.isFetchingNextPage}
        onMore={() => void data.items.fetchNextPage()}
        onSelect={(id, selected) => {
          if (batch) void actions.select(batch.id, { itemIds: [id], selected });
        }}
      />
    </Modal>
  );
}
