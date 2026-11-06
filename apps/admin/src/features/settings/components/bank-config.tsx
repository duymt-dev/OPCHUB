'use client';
import { useTranslations } from 'next-intl';
import type { BankSettings } from '@opchub/shared/api-domains';
import { Switch } from './switch';
import { BankKeyField } from './bank-key-field';
import { BankCopyButton } from './bank-copy-button';
import type { BankPanel } from '../types';
import styles from './bank.module.css';

export function BankConfig({ config: c, panel: p }: { config: BankSettings; panel: BankPanel }) {
  const t = useTranslations('settings.bank');
  const providers: ('casso' | 'sepay' | 'vcb' | 'fake')[] = ['casso', 'sepay', 'vcb'];
  if (c.canSimulate) providers.push('fake');
  return (
    <div className={styles.grid}>
      <div className={styles.panel}>
        <span className={styles.muted}>{t('providerLabel')}</span>
        <div className={styles.actions}>
          {providers.map((key) => {
            const unsupported = key === 'casso' || key === 'vcb';
            return (
              <button
                key={key}
                type="button"
                aria-disabled="true"
                aria-pressed={c.provider === key}
                title={t(unsupported ? 'unsupported' : 'serverProvider')}
                className={`${styles.button} ${unsupported ? styles.unsupported : ''} ${c.provider === key ? styles.selected : ''}`}
              >
                {t(`providers.${key}`)}
                {unsupported ? <small>{t('unsupported')}</small> : null}
              </button>
            );
          })}
        </div>
        <label className={styles.muted} htmlFor="bank-webhook">
          {t('webhook')}
        </label>
        <div className={styles.field}>
          <input id="bank-webhook" readOnly value={c.webhookUrl} />
          <BankCopyButton value={c.webhookUrl} />
        </div>
        <BankKeyField panel={p} hint={c.keyHint} provider={t(`providers.${c.provider}`)} />
      </div>
      <div className={styles.panel}>
        <div className={styles.toggle}>
          <div>
            <b>{t('auto')}</b>
            <small>{t(c.autoActivate ? 'autoOn' : 'autoOff')}</small>
          </div>
          <Switch
            on={c.autoActivate}
            label={t('auto')}
            disabled={p.busy}
            onChange={(v) => p.patch.mutate(v)}
          />
        </div>
        <div className={styles.info}>
          <Info label={t('account')} value={`${c.bankName} · ${c.accountNo}`} />
          <Info label={t('owner')} value={c.accountName} />
          <div title={t('fundraisingHint')}>
            <Info label={t('syntax')} value={t('syntaxValue')} />
          </div>
          <Info label={t('counts')} value={`${c.counts.matched} / ${c.counts.pending}`} />
        </div>
      </div>
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.infoRow}>
      <small>{label}</small>
      <span>{value}</span>
    </div>
  );
}
