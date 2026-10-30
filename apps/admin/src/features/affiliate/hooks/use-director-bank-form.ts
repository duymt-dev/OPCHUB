'use client';

import { affiliateBankSchema, type AffiliateBank } from '@opchub/shared/api-domains';
import { Form } from 'antd';
import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api-client';

export function useDirectorBankForm(
  bank: AffiliateBank | null,
  save: (bank: AffiliateBank | null) => Promise<boolean>,
) {
  const [form] = Form.useForm<AffiliateBank>();
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) {
      if (bank) form.setFieldsValue(bank);
      else form.resetFields();
    }
  }, [bank, dirty, form]);
  const errors = (issues: { path: PropertyKey[]; message: string }[]) => {
    form.setFields(
      issues.flatMap((issue) => {
        const name = issue.path.at(-1);
        return name === 'bankName' || name === 'bankNo' || name === 'bankHolder'
          ? [{ name, errors: [issue.message] }]
          : [];
      }),
    );
  };
  const submit = (values: AffiliateBank) => {
    const cleared = !values.bankName && !values.bankNo?.trim() && !values.bankHolder?.trim();
    const result = affiliateBankSchema
      .nullable()
      .safeParse(cleared ? null : { ...values, bankNo: values.bankNo?.replace(/\s/g, '') });
    if (!result.success) {
      errors(result.error.issues);
      return;
    }
    void save(result.data)
      .then((ok) => {
        if (ok) setDirty(false);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError)
          errors(
            error.fields.map((field) => ({ path: field.path.split('.'), message: field.message })),
          );
      });
  };
  return { form, dirty, markDirty: () => setDirty(true), submit };
}
