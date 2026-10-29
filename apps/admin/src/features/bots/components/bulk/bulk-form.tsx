'use client';

import { botBulkTopics } from '@opchub/shared/api-domains';
import { Form, Input } from 'antd';
import { useTranslations } from 'next-intl';
import { initialBulkValues } from '../../bulk/form-model';
import type { BotBulkInput } from '../../bulk/request-replay';
import type { BulkFormValues } from '../../bulk/types';
import type { GroupRef } from '../../types';
import { useBotBulkForm } from '../../hooks/use-bot-bulk-form';
import { BulkNumbers } from './bulk-numbers';
import { BulkGroups } from './bulk-groups';
import { TypePicker } from './type-picker';
import s from './bulk.module.css';

interface Props {
  groups: GroupRef[];
  automaticTopics: string[];
  disabled: boolean;
  error: Error | null;
  create: (input: BotBulkInput) => Promise<boolean>;
}
export function BulkForm({ groups, automaticTopics, disabled, error, create }: Props) {
  const t = useTranslations('bots.bulk');
  const { form, submit } = useBotBulkForm(create, error);
  const topics: string = Form.useWatch('topicsText', form) ?? '';
  const perTopic: number = Form.useWatch('perTopic', form) ?? 2;
  const count = botBulkTopics(topics).length;
  return (
    <Form<BulkFormValues>
      form={form}
      layout="vertical"
      initialValues={initialBulkValues}
      requiredMark={false}
      onFinish={submit}
      className={s.form}
      disabled={disabled}
    >
      <fieldset disabled={disabled} className={s.fields}>
        <div>
          <div className={s.labelRow}>
            <label htmlFor="bot-bulk-topics">{t('topics')}</label>
            <button
              type="button"
              className={s.link}
              disabled={!automaticTopics.length || disabled}
              onClick={() => form.setFieldValue('topicsText', automaticTopics.join('\n'))}
            >
              {t('useAutomatic')}
            </button>
          </div>
          <Form.Item name="topicsText">
            <Input.TextArea id="bot-bulk-topics" rows={5} placeholder={t('topicsPlaceholder')} />
          </Form.Item>
        </div>
        <Form.Item name="typeId">
          <TypePicker disabled={disabled} />
        </Form.Item>
        <BulkNumbers />
        <Form.Item name="groupIds">
          <BulkGroups groups={groups} disabled={disabled} />
        </Form.Item>
        <div className={s.generate}>
          <span>{t('summary', { topics: count, perTopic, total: count * perTopic })}</span>
          <button type="submit" className={s.purple} disabled={disabled}>
            {t('generate')}
          </button>
        </div>
      </fieldset>
    </Form>
  );
}
