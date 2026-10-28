'use client';

import {
  botConversationTypeInputSchema,
  type BotConversationTypeInput,
} from '@opchub/shared/api-domains';
import { Form } from 'antd';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api-client';
import type { useBotConversationTypes } from './use-bot-conversation-types';

function fieldName(path: unknown): keyof BotConversationTypeInput | null {
  return path === 'name' || path === 'description' ? path : null;
}
export function useBotTypeForm(
  catalog: ReturnType<typeof useBotConversationTypes>,
  onCreated: (id: string) => void,
) {
  const t = useTranslations('bots.bulk');
  const [form] = Form.useForm<BotConversationTypeInput>();
  useEffect(() => {
    if (catalog.error instanceof ApiError)
      form.setFields(
        catalog.error.fields.flatMap((field) => {
          const name = fieldName(field.path);
          return name ? [{ name, errors: [field.message] }] : [];
        }),
      );
  }, [catalog.error, form]);
  const submit = async (values: BotConversationTypeInput) => {
    const parsed = botConversationTypeInputSchema.safeParse(values);
    if (!parsed.success) {
      form.setFields(
        parsed.error.issues.flatMap((issue) => {
          const name = fieldName(issue.path[0]);
          return name ? [{ name, errors: [t('invalidType')] }] : [];
        }),
      );
      return;
    }
    const result = await catalog.create(parsed.data);
    if (result.ok && result.value) {
      form.resetFields();
      onCreated(result.value.id);
    }
  };
  return { form, submit };
}
