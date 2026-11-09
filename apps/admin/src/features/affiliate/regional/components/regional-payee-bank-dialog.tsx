'use client';
import { useState } from 'react';
import { Button, Modal } from 'antd';
import { useTranslations } from 'next-intl';
import type { RegionalPayee, RegionalRegion } from '@opchub/shared/api-domains';
import { useRegionalPayeeBank } from '../hooks/use-regional-payee-bank';
import { RegionalBankFields } from './regional-bank-fields';

export function RegionalPayeeBankDialog({
  region,
  payee,
}: {
  region: RegionalRegion;
  payee: RegionalPayee;
}) {
  const t = useTranslations('affiliate.regional.share');
  const [open, setOpen] = useState(false);
  const write = useRegionalPayeeBank(region, payee.userId);
  return (
    <>
      <Button size="small" onClick={() => setOpen(true)}>
        {t('enterBank')}
      </Button>
      <Modal
        open={open}
        title={`${t('enterBank')} · ${payee.fullName}`}
        footer={null}
        width={520}
        destroyOnHidden
        closable={!write.isPending}
        maskClosable={!write.isPending}
        onCancel={() => setOpen(false)}
      >
        <RegionalBankFields
          bank={payee.bank ?? { bankName: '', bankNo: '', bankHolder: '' }}
          disabled={write.isPending}
          onSave={(bank) => write.mutate(bank, { onSuccess: () => setOpen(false) })}
        />
      </Modal>
    </>
  );
}
