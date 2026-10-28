'use client';

import { Form, Input } from 'antd';
import { useTranslations } from 'next-intl';
import { useBotTypeForm } from '../../hooks/use-bot-type-form';
import type { useBotConversationTypes } from '../../hooks/use-bot-conversation-types';
import { BulkError } from './bulk-error';
import s from './types.module.css';

export function TypeEditor({
  catalog,
  onCreated,
}: {
  catalog: ReturnType<typeof useBotConversationTypes>;
  onCreated: (id: string) => void;
}) {
  const t = useTranslations('bots.bulk');
  const { form, submit } = useBotTypeForm(catalog, onCreated);
  return (
    <div>
      <Form
        form={form}
        component={false}
        initialValues={{ name: '', description: '' }}
        onFinish={(values) => void submit(values)}
      >
        <div className={s.editor}>
          <Form.Item name="name">
            <Input
              aria-label={t('typeName')}
              placeholder={t('typeNamePlaceholder')}
              onPressEnter={(event) => {
                event.preventDefault();
                form.submit();
              }}
              maxLength={60}
              disabled={catalog.busy || !catalog.allowed}
            />
          </Form.Item>
          <Form.Item name="description">
            <Input
              aria-label={t('typeDescription')}
              placeholder={t('typeDescriptionPlaceholder')}
              onPressEnter={(event) => {
                event.preventDefault();
                form.submit();
              }}
              maxLength={2000}
              disabled={catalog.busy || !catalog.allowed}
            />
          </Form.Item>
          <button
            type="button"
            className={s.add}
            disabled={catalog.busy || !catalog.allowed}
            onClick={() => form.submit()}
          >
            {t('add')}
          </button>
        </div>
      </Form>
      <BulkError error={catalog.error} />
    </div>
  );
}
