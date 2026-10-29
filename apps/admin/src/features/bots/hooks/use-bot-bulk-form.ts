'use client';

import { Form } from 'antd';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api-client';
import { bulkFieldName, parseBulkForm } from '../bulk/form-model';
import type { BulkFormValues } from '../bulk/types';
import type { BotBulkInput } from '../bulk/request-replay';

export function useBotBulkForm(
  create: (input: BotBulkInput) => Promise<boolean>,
  error: Error | null,
) {
  const [form] = Form.useForm<BulkFormValues>();
  const t = useTranslations('bots.bulk');
  useEffect(() => {
    if (error instanceof ApiError) {
      form.setFields(
        error.fields.flatMap((field) => {
          const name = bulkFieldName(field.path);
          return name ? [{ name, errors: [field.message] }] : [];
        }),
      );
    }
  }, [error, form]);
  const submit = (values: BulkFormValues) => {
    const parsed = parseBulkForm(values);
    if (!parsed.success) {
      const names = [
        ...new Set(parsed.error.issues.map((issue) => bulkFieldName(String(issue.path[0])))),
      ];
      form.setFields(
        names.flatMap((name) => (name ? [{ name, errors: [t(`invalid.${name}`)] }] : [])),
      );
      return;
    }
    void create(parsed.data);
  };
  return { form, submit };
}
