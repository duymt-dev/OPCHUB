'use client';
import { AI_PROVIDER_CATALOG } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import type { AiPanel } from './types';
import styles from './ai.module.css';
export function AiProviderGrid({ p }: { p: AiPanel }) {
  const t = useTranslations('settings.ai');
  return (
    <div className={styles.grid}>
      {p.form?.providers.map((r) => {
        const c = AI_PROVIDER_CATALOG[r.id];
        const status = p.status(r.id);
        return (
          <button
            type="button"
            key={r.id}
            aria-pressed={p.selected === r.id}
            className={`${styles.provider} ${p.selected === r.id ? styles.selected : ''}`}
            onClick={() => p.select(r.id)}
          >
            <span className={styles.initials} style={{ background: c.color }}>
              {c.initials}
            </span>
            <span>
              <b>{c.name}</b>
              <small>
                <i
                  style={{
                    background: r.enabled
                      ? { ok: '#52C41A', err: '#FF4D4F', none: '#BFBFBF' }[status]
                      : '#BFBFBF',
                  }}
                />
                {r.enabled ? t(status) : t('off')} · {r.enabled ? r.model || '—' : '—'}
              </small>
            </span>
          </button>
        );
      })}
    </div>
  );
}
