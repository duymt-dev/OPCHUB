'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { affiliateBankNo } from '../format';
import type { AffiliateAgentIdentityProps } from '../types';
import { CommissionStatus } from './commission-status';
import styles from './agent-layout.module.css';
import shared from './affiliate.module.css';

export function AgentIdentity({ id, name, email, status, bank }: AffiliateAgentIdentityProps) {
  const t = useTranslations('affiliate');
  return (
    <div className={styles.identity}>
      <div className={styles.name} data-status={status}>
        <Link data-ro-ok href={`/affiliate/${encodeURIComponent(id)}`}>
          <b>{name}</b>
        </Link>
        <CommissionStatus status={status} />
      </div>
      <span className={shared.hint}>{email}</span>
      <span className={styles.bank} data-missing={!bank}>
        {bank
          ? `${bank.bankHolder} · ${bank.bankName} · ${affiliateBankNo(bank.bankNo)}`
          : t('noBank')}
      </span>
    </div>
  );
}
