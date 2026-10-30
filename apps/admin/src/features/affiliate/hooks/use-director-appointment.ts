'use client';

import {
  directorAppointmentSchema,
  type DirectorRegion,
  type DirectorSlot,
} from '@opchub/shared/api-domains';
import { Form } from 'antd';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api-client';
import type { useRegionalDirectors } from './use-regional-directors';

export interface DirectorAppointmentOptions {
  slots: DirectorSlot[];
  write: ReturnType<typeof useRegionalDirectors>['write'];
  canManage: boolean;
  close: () => void;
}
export function useDirectorAppointment({
  slots,
  write,
  canManage,
  close,
}: DirectorAppointmentOptions) {
  const t = useTranslations('affiliate.directors');
  const [form] = Form.useForm<{ region: DirectorRegion; userId: string }>();
  const submit = (values: { region: DirectorRegion; userId: string }) => {
    const slot = slots.find((item) => item.region === values.region);
    const parsed = directorAppointmentSchema.safeParse({ ...values, version: slot?.version });
    if (!parsed.success) {
      form.setFields(
        parsed.error.issues.flatMap((issue) => {
          const name = issue.path[0];
          return name === 'region' || name === 'userId' ? [{ name, errors: [t('required')] }] : [];
        }),
      );
      return;
    }
    if (!canManage) return;
    if (slot?.incumbent) {
      form.setFields([{ name: 'region', errors: [t('full')] }]);
      return;
    }
    write.mutate(
      { kind: 'appoint', body: parsed.data },
      {
        onSuccess: (result) => {
          if (result) close();
        },
        onError: (error) => {
          if (error instanceof ApiError)
            form.setFields(
              error.fields.flatMap((field) =>
                field.path === 'userId' || field.path === 'region'
                  ? [{ name: field.path, errors: [field.message] }]
                  : [],
              ),
            );
        },
      },
    );
  };
  return { form, submit };
}
