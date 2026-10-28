'use client';

import type { BotConversationType } from '@opchub/shared/api-domains';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useBotConversationTypes } from '../../hooks/use-bot-conversation-types';
import { BulkError } from './bulk-error';
import { TypeCards } from './type-cards';
import { TypeEditor } from './type-editor';
import { TypeDeleteDialog } from './type-delete-dialog';
import s from './types.module.css';

export function TypePicker({
  value,
  onChange,
  disabled,
}: {
  value?: string;
  onChange?: (id: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('bots.bulk');
  const catalog = useBotConversationTypes();
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState<BotConversationType | null>(null);
  const types =
    catalog.createdType && !catalog.types.some((type) => type.id === catalog.createdType?.id)
      ? [...catalog.types, catalog.createdType]
      : catalog.types;
  const locked = disabled || catalog.busy || !catalog.allowed;
  const deleted = (id: string) => {
    if (value === id) onChange?.('builtin-qa');
    setTarget(null);
  };
  return (
    <div className={s.section}>
      <div className={s.heading}>
        <span>{t('type')}</span>
        <button
          type="button"
          className={s.link}
          disabled={locked}
          onClick={() => setEditing(!editing)}
        >
          {t('addType')}
        </button>
      </div>
      {catalog.query.isPending ? <span role="status">{t('loading')}</span> : null}
      <BulkError error={catalog.query.error} onRetry={() => void catalog.query.refetch()} />
      <TypeCards
        types={types}
        value={value}
        disabled={!!locked}
        onChange={(id) => onChange?.(id)}
        onDelete={setTarget}
      />
      {catalog.query.hasNextPage ? (
        <button
          type="button"
          className={s.link}
          disabled={catalog.query.isFetchingNextPage}
          onClick={() => void catalog.query.fetchNextPage()}
        >
          {t('moreTypes')}
        </button>
      ) : null}
      {editing ? (
        <TypeEditor
          catalog={catalog}
          onCreated={(id) => {
            onChange?.(id);
            setEditing(false);
          }}
        />
      ) : null}
      <TypeDeleteDialog
        target={target}
        catalog={catalog}
        onClose={() => setTarget(null)}
        onDeleted={deleted}
      />
    </div>
  );
}
