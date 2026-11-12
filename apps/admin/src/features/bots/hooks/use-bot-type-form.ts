'use client';

import {
  botConversationTypeInputSchema,
  type BotConversationTypeInput,
} from '@opchub/shared/api-domains';
import { Form } from 'antd';
import { useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api-client';
import { useSchemaFormErrors } from '@/i18n/use-schema-form-errors';
import type { useBotConversationTypes } from './use-bot-conversation-types';

const FIELDS = ['name', 'description'] as const;
function fieldName(path: unknown): keyof BotConversationTypeInput | null {
  return path === 'name' || path === 'description' ? path : null;
}
export function useBotTypeForm(
  catalog: ReturnType<typeof useBotConversationTypes>,
  onCreated: (id: string) => void,
) {
  const t = useTranslations('bots.bulk');
  const [form] = Form.useForm<BotConversationTypeInput>();
  const invalid = useCallback(() => t('invalidType'), [t]);
  const { local, raw, clear } = useSchemaFormErrors(form, FIELDS, invalid);
  useEffect(() => {
    if (catalog.error instanceof ApiError)
      raw(
        Object.fromEntries(
          catalog.error.fields.flatMap((field) => {
            const name = fieldName(field.path);
            return name ? [[name, field.message]] : [];
          }),
        ),
      );
  }, [catalog.error, raw]);
  const submit = async (values: BotConversationTypeInput) => {
    const parsed = botConversationTypeInputSchema.safeParse(values);
    if (!parsed.success) {
      local(parsed.error);
      return;
    }
    clear();
    const result = await catalog.create(parsed.data);
    if (result.ok && result.value) {
      form.resetFields();
      onCreated(result.value.id);
    }
  };
  return { form, submit };
}
