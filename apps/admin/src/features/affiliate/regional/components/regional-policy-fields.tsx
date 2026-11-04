'use client';
import { Form, InputNumber } from 'antd';
import { useTranslations } from 'next-intl';
import layout from '../../components/policy-layout.module.css';
export function RegionalPolicyFields() {
  const t = useTranslations('affiliate.policy');
  return (
    <section>
      <h3>{t('regionalTitle')}</h3>
      <p>{t('regionalHint')}</p>
      <div className={layout.fields}>
        {(['regionalFirstYear', 'regionalStep', 'regionalMin'] as const).map((key) => (
          <Form.Item
            key={key}
            name={key}
            label={t(key)}
            dependencies={['regionalFirstYear']}
            rules={[
              {
                required: true,
                type: 'integer',
                min: key === 'regionalFirstYear' ? 1 : 0,
                max: 100,
              },
              ({ getFieldValue }) => ({
                validator: (_rule, value: unknown) =>
                  key === 'regionalMin' &&
                  typeof value === 'number' &&
                  value > Number(getFieldValue('regionalFirstYear'))
                    ? Promise.reject(new Error(t('regionalInvalid')))
                    : Promise.resolve(),
              }),
            ]}
          >
            <InputNumber
              min={key === 'regionalFirstYear' ? 1 : 0}
              max={100}
              precision={0}
              aria-label={t(key)}
            />
          </Form.Item>
        ))}
      </div>
    </section>
  );
}
