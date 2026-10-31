'use client';

import { affiliatePolicySchema, type AffiliatePolicy } from '@opchub/shared/api-domains';
import { Form } from 'antd';
import { fieldsOf } from '@/lib/api-errors';
import { useAffiliateWrites } from './use-affiliate-writes';

const POLICY_FIELDS = [
  'defaultRate',
  'cookieDays',
  'terms',
  'yearOneRate',
  'annualDecrease',
  'minimumRate',
] as const;

export function useAffiliatePolicyForm() {
  const [form] = Form.useForm<AffiliatePolicy>();
  const { policy } = useAffiliateWrites();
  const submit = (values: AffiliatePolicy) => {
    const result = affiliatePolicySchema.safeParse(values);
    if (!result.success) {
      form.setFields(
        result.error.issues.flatMap((issue) => {
          const key = issue.path[0];
          return POLICY_FIELDS.filter((name) => name === key).map((name) => ({
            name,
            errors: [issue.message],
          }));
        }),
      );
      return;
    }
    policy.mutate(result.data, {
      onError: (error) => {
        const errors = fieldsOf<keyof AffiliatePolicy>(error);
        // Only registered policy fields may receive server errors; keep the draft.
        form.setFields(
          POLICY_FIELDS.flatMap((name) => {
            const message = errors[name];
            return message ? [{ name, errors: [message] }] : [];
          }),
        );
      },
    });
  };
  return { form, policy, submit };
}
