'use client';
import { Button, Form, Input } from 'antd';
import { useTranslations } from 'next-intl';
import { regionalBankSchema, type RegionalSlot } from '@opchub/shared/api-domains';
import styles from './regional.module.css';

export function RegionalBankFields({
  bank,
  disabled,
  onSave,
}: {
  bank: RegionalSlot['bank'];
  disabled: boolean;
  onSave: (bank: RegionalSlot['bank']) => void;
}) {
  const t = useTranslations('affiliate.regional');
  const [form] = Form.useForm<RegionalSlot['bank']>();
  const values = Form.useWatch([], form) as RegionalSlot['bank'] | undefined;
  const dirty =
    values &&
    (['bankName', 'bankNo', 'bankHolder'] as const).some((key) => values[key] !== bank[key]);
  return (
    <div className={styles.bank}>
      <b className={styles.sectionTitle}>{t('bankTitle')}</b>
      <Form
        key={JSON.stringify(bank)}
        form={form}
        initialValues={bank}
        disabled={disabled}
        layout="vertical"
        onFinish={(raw: unknown) => {
          const r = regionalBankSchema.safeParse(raw);
          if (r.success) onSave(r.data);
        }}
      >
        <div className={styles.bankGrid}>
          {(['bankName', 'bankNo', 'bankHolder'] as const).map((key) => (
            <Form.Item
              key={key}
              name={key}
              label={t(key)}
              rules={[
                {
                  validator: (_, value: unknown) => {
                    const result = regionalBankSchema.shape[key].safeParse(value);
                    return result.success
                      ? Promise.resolve()
                      : Promise.reject(new Error(result.error.issues[0]?.message));
                  },
                },
              ]}
            >
              <Input />
            </Form.Item>
          ))}
        </div>
        {!disabled && dirty && (
          <Button size="small" htmlType="submit">
            {t('save')}
          </Button>
        )}
      </Form>
    </div>
  );
}
