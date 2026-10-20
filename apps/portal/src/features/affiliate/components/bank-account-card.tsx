'use client';

import { WarningOutlined } from '@ant-design/icons';
import { AFFILIATE_BANKS, type AffiliateBank } from '@opchub/shared/api-domains';
import { invalidProps } from '@opchub/ui';
import { Form } from 'antd';
import { useTranslations } from 'next-intl';
import type { useBankForm } from '../hooks/use-bank-form';
import styles from './bank.module.css';

type BankForm = ReturnType<typeof useBankForm>;

export function BankWarning({ onEdit }: { onEdit: () => void }) {
  const t = useTranslations('affiliate.bank');
  return (
    <div className={styles.warning}>
      <WarningOutlined />
      <span>
        <b>{t('missing')}</b> {t('warning')}
      </span>
      <button type="button" onClick={onEdit}>
        {t('update')}
      </button>
    </div>
  );
}

function BankEditor({ form: f }: { form: BankForm }) {
  const t = useTranslations('affiliate.bank');
  const fields = ['bankName', 'bankNo', 'bankHolder'] as const;
  if (!f.draft) return null;
  return (
    <Form className={styles.editor} layout="vertical" onFinish={() => void f.save()}>
      <fieldset disabled={f.busy}>
        {fields.map((key) => (
          <Form.Item
            key={key}
            label={t(key)}
            required
            htmlFor={`affiliate-${key}`}
            validateStatus={f.err(key) ? 'error' : ''}
          >
            {key === 'bankName' ? (
              <select
                id={`affiliate-${key}`}
                {...invalidProps(f.err(key))}
                value={f.draft?.bankName}
                onChange={(e) => f.set(key, e.target.value)}
              >
                <option value="">{t('choose')}</option>
                {AFFILIATE_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`affiliate-${key}`}
                {...invalidProps(f.err(key))}
                value={f.draft?.[key]}
                onChange={(e) => f.set(key, e.target.value)}
                inputMode={key === 'bankNo' ? 'numeric' : 'text'}
                maxLength={key === 'bankNo' ? 19 : 150}
                placeholder={t(key === 'bankNo' ? 'numberPlaceholder' : 'holderPlaceholder')}
              />
            )}
            {key === 'bankHolder' ? <small>{t('hint')}</small> : null}
            {f.err(key) ? (
              <span
                id={f.err(key)?.id}
                className={styles.error}
                role={f.err(key)?.alert ? 'alert' : undefined}
              >
                {f.err(key)?.text}
              </span>
            ) : null}
          </Form.Item>
        ))}
        <div className={styles.actions}>
          <button type="button" onClick={f.cancel}>
            {t('cancel')}
          </button>
          <button type="submit" className={styles.save} disabled={f.busy}>
            {t('save')}
          </button>
        </div>
      </fieldset>
    </Form>
  );
}

export function BankAccountCard({ bank, form }: { bank: AffiliateBank | null; form: BankForm }) {
  const t = useTranslations('affiliate.bank');
  if (form.draft) return <BankEditor form={form} />;
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span>{t('title')}</span>
        <button type="button" onClick={() => form.edit(bank)}>
          {t('edit')}
        </button>
      </div>
      {bank ? (
        <>
          <b>{bank.bankHolder}</b>
          <span>
            {bank.bankName} · {bank.bankNo}
          </span>
        </>
      ) : (
        <>
          <span className={styles.missing}>{t('noAccount')}</span>
          <button type="button" className={styles.add} onClick={() => form.edit(null)}>
            {t('add')}
          </button>
        </>
      )}
    </div>
  );
}
