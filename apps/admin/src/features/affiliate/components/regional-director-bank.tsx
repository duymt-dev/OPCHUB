'use client';

import {
  AFFILIATE_BANKS,
  type AffiliateBank,
  type DirectorRegion,
} from '@opchub/shared/api-domains';
import { Button, Form, Input, Select } from 'antd';
import { useTranslations } from 'next-intl';
import { useDirectorBankForm } from '../hooks/use-director-bank-form';
import styles from './regional-director.module.css';

export function RegionalDirectorBank({
  bank,
  region,
  disabled,
  busy,
  save,
}: {
  bank: AffiliateBank | null;
  region: DirectorRegion;
  disabled: boolean;
  busy: boolean;
  save: (bank: AffiliateBank | null) => Promise<boolean>;
}) {
  const t = useTranslations('affiliate.directors');
  const { form, dirty, markDirty, submit } = useDirectorBankForm(bank, save);
  return (
    <Form
      form={form}
      name={`director-bank-${region}`}
      layout="vertical"
      requiredMark={false}
      disabled={disabled || busy}
      className={styles.bank}
      onValuesChange={markDirty}
      onFinish={submit}
      aria-label={t('bankSection')}
    >
      <div className={styles.sectionTitle}>{t('bankSection')}</div>
      <Form.Item name="bankName" label={t('bankName')}>
        <Select allowClear options={AFFILIATE_BANKS.map((value) => ({ value, label: value }))} />
      </Form.Item>
      <div className={styles.bankFields}>
        <Form.Item name="bankNo" label={t('bankNo')}>
          <Input inputMode="numeric" maxLength={24} />
        </Form.Item>
        <Form.Item name="bankHolder" label={t('bankHolder')}>
          <Input maxLength={150} />
        </Form.Item>
      </div>
      {dirty ? (
        <Button htmlType="submit" type="primary" loading={busy}>
          {t('saveBank')}
        </Button>
      ) : null}
    </Form>
  );
}
