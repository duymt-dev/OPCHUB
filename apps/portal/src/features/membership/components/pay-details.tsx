'use client';

import type { MyMembership } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { planOf } from '@opchub/shared';
import { useAuthStore } from '@/lib/auth-store';
import { formatVnd } from '../model';
import styles from './pay-modal.module.css';

type CopyKey = 'copiedAccount' | 'copiedAmount' | 'copiedContent';

function Row({
  k,
  children,
  copy,
  hl,
}: {
  k: string;
  children: ReactNode;
  copy?: () => void;
  hl?: boolean;
}) {
  const t = useTranslations('membership.pay');
  return (
    <>
      <span className={`${styles.k} ${hl ? styles.hl : ''}`}>{k}</span>
      <div className={`${styles.v} ${hl ? styles.hl : ''}`}>
        <span className={`${styles.val} ${hl ? styles.ref : ''}`}>{children}</span>
        {copy ? (
          <button type="button" className={styles.copy} onClick={copy}>
            {t('copy')}
          </button>
        ) : null}
      </div>
    </>
  );
}

/** Thân hộp chuyển khoản: QR + bảng thông tin (P-84) + sao chép (P-85) */
export function PayDetails({ m }: { m: MyMembership }) {
  const t = useTranslations('membership');
  const toast = useToast();
  const name = useAuthStore((s) => s.me?.fullName ?? '');
  const plan = planOf(useAuthStore((s) => s.me?.accountType ?? 'personal')) ?? 'personal';
  const copy = (value: string, msg: CopyKey) => () => {
    void navigator.clipboard?.writeText(value).catch(() => undefined);
    toast(t(`toast.${msg}`));
  };

  return (
    <div className={styles.body}>
      <div className={styles.qr}>
        <img
          src="/vcb-qr.png"
          alt={t('pay.qrAlt', { name: m.bank.accountName, account: m.bank.accountNo })}
        />
      </div>
      <div className={styles.info}>
        <div className={styles.table}>
          <Row k={t('pay.bank')}>{m.bank.bankFullName}</Row>
          <Row k={t('pay.account')} copy={copy(m.bank.accountNo, 'copiedAccount')}>
            <b>{m.bank.accountNo}</b>
          </Row>
          <Row k={t('pay.holder')}>{m.bank.accountName}</Row>
          <Row k={t('pay.amount')} copy={copy(String(m.amount), 'copiedAmount')}>
            <b>{formatVnd(m.amount)}</b>
          </Row>
          <Row k={t('pay.content')} copy={copy(m.transferContent, 'copiedContent')} hl>
            {m.transferContent}
          </Row>
        </div>
        <div className={styles.guide}>
          {t.rich('pay.guide', {
            name,
            code: m.memberCode,
            b: (c) => <b>{c}</b>,
            br: () => <br />,
          })}
        </div>
        <div className={styles.terms}>
          {t.rich('pay.terms', {
            name: t(`plans.${plan}.name`),
            amount: formatVnd(m.amount),
            b: (c) => <b>{c}</b>,
          })}
        </div>
      </div>
    </div>
  );
}
