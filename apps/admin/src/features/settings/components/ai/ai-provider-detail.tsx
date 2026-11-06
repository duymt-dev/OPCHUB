'use client';
import { AiProviderFields } from './ai-provider-fields';
import { AI_PROVIDER_CATALOG } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { Switch } from '../switch';
import type { AiPanel } from './types';
import styles from './ai.module.css';
export function AiProviderDetail({ p }: { p: AiPanel }) {
  const t = useTranslations('settings.ai');
  const row = p.form?.providers.find((r) => r.id === p.selected);
  if (!row) return null;
  const catalog = AI_PROVIDER_CATALOG[row.id];
  const saved = p.query.data?.providers.find((r) => r.id === row.id);
  const set = (patch: Parameters<AiPanel['provider']>[1]) => p.provider(row.id, patch);
  return (
    <section className={styles.card} aria-label={catalog.name}>
      <div className={`${styles.row} ${styles.providerHeading}`}>
        <span className={styles.initials} style={{ background: catalog.color }}>
          {catalog.initials}
        </span>
        <div className={styles.grow}>
          <b>{catalog.name}</b>
          <small>{t('keySource', { source: catalog.keySource })}</small>
        </div>
        <span>{t('enabled')}</span>
        <Switch
          on={row.enabled}
          onChange={(enabled) => set({ enabled })}
          label={t('enabled')}
          disabled={p.busy}
        />
      </div>
      <AiProviderFields p={p} />
      <div className={`${styles.row} ${styles.detailFooter}`}>
        <small>
          {t(p.status(row.id))}
          {saved?.checkedAt
            ? ` · ${t('checked', { at: new Date(saved.checkedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) })}`
            : ''}
        </small>
        <button
          type="button"
          disabled={p.busy}
          onClick={() =>
            p.verify.mutate({
              id: row.id,
              key: row.key ?? '',
              baseUrl: row.baseUrl,
              model: row.model,
            })
          }
        >
          {t(p.verify.isPending ? 'checking' : 'verify')}
        </button>
      </div>
      <small>{t('keyNote')}</small>
    </section>
  );
}
