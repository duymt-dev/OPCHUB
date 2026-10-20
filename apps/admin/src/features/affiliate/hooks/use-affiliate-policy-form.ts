'use client';

import { affiliatePolicySchema, type AffiliatePolicy } from '@opchub/shared/api-domains';
import { Form } from 'antd';
import { useAffiliateWrites } from './use-affiliate-writes';

export function useAffiliatePolicyForm() {
  const [form] = Form.useForm<AffiliatePolicy>();
  const { policy } = useAffiliateWrites();
  const submit = (values: AffiliatePolicy) => {
    const result = affiliatePolicySchema.safeParse(values);
    if (!result.success) {
      form.setFields(
        result.error.issues.flatMap((issue) => {
          const key = issue.path[0];
          if (key !== 'defaultRate' && key !== 'cookieDays' && key !== 'terms') return [];
          return [{ name: key, errors: [issue.message] }];
        }),
      );
      return;
    }
    policy.mutate(result.data);
  };
  return { form, policy, submit };
}
