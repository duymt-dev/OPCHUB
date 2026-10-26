'use client';

import { FUNDRAISING_PLAN, fundraisingCommission, MEMBERSHIP_PLANS } from '@opchub/shared';
import { Form, InputNumber } from 'antd';
import { useTranslations } from 'next-intl';
import { affiliateMoney } from '../format';
import layout from './policy-layout.module.css';

/** D-70 (V4-602): giá gói lấy từ nguồn duy nhất; % Gọi vốn chỉ hiển thị như prototype v4 */
export function PolicyFields() {
  const t = useTranslations('affiliate');
  const fundRate: unknown = Form.useWatch('fundraisingRate');
  const rate = typeof fundRate === 'number' ? fundRate : 10;
  return (
    <>
      <div className={layout.fields}>
        <Form.Item
          name="defaultRate"
          label={t('policy.rate')}
          extra={t('policy.rateHint', {
            personal: affiliateMoney(MEMBERSHIP_PLANS.personal.amount),
            business: affiliateMoney(MEMBERSHIP_PLANS.business.amount),
          })}
          rules={[{ required: true, type: 'integer', min: 1, max: 50 }]}
        >
          <InputNumber min={1} max={50} precision={0} aria-label={t('policy.rate')} />
        </Form.Item>
        <div className={layout.readonly} role="group" aria-label={t('policy.fundraising')}>
          <span className={layout.readonlyLabel}>{t('policy.fundraising')}</span>
          <div className={layout.readonlyValue}>{rate}</div>
          <span className={layout.readonlyHint}>
            {t('policy.fundraisingHint', {
              commission: affiliateMoney(fundraisingCommission(rate)),
              amount: affiliateMoney(FUNDRAISING_PLAN.amount),
            })}
          </span>
        </div>
        <Form.Item name="fundraisingRate" hidden>
          <InputNumber />
        </Form.Item>
        <Form.Item
          name="cookieDays"
          label={t('policy.cookie')}
          extra={t('policy.cookieHint')}
          rules={[{ required: true, type: 'integer', min: 1, max: 365 }]}
        >
          <InputNumber min={1} max={365} precision={0} aria-label={t('policy.cookie')} />
        </Form.Item>
      </div>
    </>
  );
}
