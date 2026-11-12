'use client';

import { affiliatePolicySchema, type AffiliatePolicy } from '@opchub/shared/api-domains';
import { Form } from 'antd';
import { fieldsOf } from '@/lib/api-errors';
import { useSchemaFormErrors } from '@/i18n/use-schema-form-errors';
import { useAffiliateWrites } from './use-affiliate-writes';

const POLICY_FIELDS = [
  'defaultRate',
  'cookieDays',
  'terms',
  'regionalFirstYear',
  'regionalStep',
  'regionalMin',
] as const;

export function useAffiliatePolicyForm() {
  const [form] = Form.useForm<AffiliatePolicy>();
  const { policy } = useAffiliateWrites();
  const errors = useSchemaFormErrors(form, POLICY_FIELDS);
  const submit = (values: AffiliatePolicy) => {
    const result = affiliatePolicySchema.safeParse(values);
    if (!result.success) {
      errors.local(result.error);
      return;
    }
    errors.clear();
    policy.mutate(result.data, {
      onError: (error) => {
        // Only registered policy fields may receive server errors; keep the draft.
        errors.raw(fieldsOf<keyof AffiliatePolicy>(error));
      },
    });
  };
  return { form, policy, submit };
}
