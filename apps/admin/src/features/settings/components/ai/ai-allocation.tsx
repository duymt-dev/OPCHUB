'use client';
import { AI_PURPOSES } from '@opchub/shared/api-domains';
import { useAiProviderLabel } from '../../hooks/use-ai-provider-label';
import { useTranslations } from 'next-intl';
import type { AiPanel } from './types';
import styles from './ai.module.css';
import { AiPurposeModel } from './ai-purpose-model';
export function AiAllocation({ p }: { p: AiPanel }) {
  const providerLabel = useAiProviderLabel();
  const t = useTranslations('settings.ai');
  const form = p.form;
  if (!form) return null;
  return (
    <section className={styles.card}>
      <h2>{t('allocation')}</h2>
      <p>{t('allocationSub')}</p>
      <div className={styles.table}>
        {[...AI_PURPOSES, 'fallback' as const].map((key) => (
          <div className={styles.row} key={key}>
            <div>
              <b>{t(key)}</b>
              <small>{t(`${key}Sub`)}</small>
            </div>
            <select
              aria-label={t(key)}
              aria-invalid={
                p.warnings.includes(key) && !(key === 'fallback' ? form.fallback : form.use[key])
              }
              value={key === 'fallback' ? form.fallback : form.use[key]}
              disabled={p.busy}
              onChange={(e) => {
                const v = e.target.value as typeof form.fallback;
                p.set(key === 'fallback' ? { fallback: v } : { use: { ...form.use, [key]: v } });
              }}
            >
              <option value="">{t('unused')}</option>
              {form.providers
                .filter((r) => r.enabled)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {providerLabel(r.id)}
                  </option>
                ))}
            </select>
            {key !== 'fallback' ? <AiPurposeModel p={p} purpose={key} /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
