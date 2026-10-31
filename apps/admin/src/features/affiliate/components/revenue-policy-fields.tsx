'use client';

import { revenueSharingPolicySchema } from '@opchub/shared/api-domains';
import { Form, InputNumber } from 'antd';
import { useTranslations } from 'next-intl';
import styles from './revenue-policy-fields.module.css';

const fields = ['yearOneRate', 'annualDecrease', 'minimumRate'] as const;

/** D-119: editable policy only; historical receipts retain their captured rates. */
export function RevenuePolicyFields() {
  const t = useTranslations('affiliate.sharingPolicy');
  return (
    <section className={styles.section} aria-label={t('title')}>
      <div className={styles.heading}>
        <h3>{t('title')}</h3>
        <span>{t('scope')}</span>
      </div>
      <div className={styles.fields}>
        {fields.map((name) => (
          <Form.Item
            key={name}
            name={name}
            label={t(name)}
            dependencies={name === 'minimumRate' ? ['yearOneRate'] : []}
            rules={[
              {
                validator: (_, value: unknown) =>
                  revenueSharingPolicySchema.shape[name].safeParse(value).success
                    ? Promise.resolve()
                    : Promise.reject(new Error(t('invalid'))),
              },
            ]}
          >
            <InputNumber min={0} max={100} aria-label={t(name)} suffix="%" />
          </Form.Item>
        ))}
      </div>
    </section>
  );
}
