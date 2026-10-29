'use client';

import { fundCommissionOf } from '@opchub/shared';
import { Form, InputNumber } from 'antd';
import { useTranslations } from 'next-intl';
import { usePrices } from '@/lib/use-prices';
import { affiliateMoney } from '../format';
import layout from './policy-layout.module.css';

/** D-70 (V4-602): giá gói lấy từ Cấu hình bảng giá (D-94 5A); % Gọi vốn chỉ hiển thị như prototype */
export function PolicyFields() {
  const t = useTranslations('affiliate');
  const fundRate: unknown = Form.useWatch('fundraisingRate');
  const rate = typeof fundRate === 'number' ? fundRate : 10;
  const prices = usePrices();
  const money = (n: number | undefined) => (n === undefined ? '—' : affiliateMoney(n));
  return (
    <>
      <div className={layout.fields}>
        <Form.Item
          name="defaultRate"
          label={t('policy.rate')}
          extra={t('policy.rateHint', {
            personal: money(prices?.per.y),
            business: money(prices?.biz.y),
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
              commission: money(prices && fundCommissionOf(prices.fund.p, rate)),
              amount: money(prices?.fund.p),
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
