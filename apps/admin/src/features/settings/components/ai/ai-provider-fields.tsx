'use client';
import { useState } from 'react';
import { AI_PROVIDER_CATALOG } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import type { AiPanel } from './types';
import styles from './ai.module.css';
function AiKeyField({ p }: { p: AiPanel }) {
  const t = useTranslations('settings.ai');
  const [visible, show] = useState(false);
  const row = p.form?.providers.find((r) => r.id === p.selected);
  if (!row) return null;
  const catalog = AI_PROVIDER_CATALOG[row.id];
  const saved = p.query.data?.providers.find((r) => r.id === row.id);
  const set = (patch: Parameters<AiPanel['provider']>[1]) => p.provider(row.id, patch);
  return (
    <label>
      {t('key')}
      <span className={styles.key}>
        <input
          aria-label={t('key')}
          maxLength={500}
          type={visible ? 'text' : 'password'}
          value={row.key ?? ''}
          autoComplete="off"
          placeholder={catalog.keyHint}
          disabled={p.busy}
          onChange={(e) => set({ key: e.target.value })}
        />
        <button type="button" onClick={() => show(!visible)}>
          {t(visible ? 'hide' : 'show')}
        </button>
      </span>
      {saved?.keyLast4 && <small>{t('masked', { last: saved.keyLast4 })}</small>}
    </label>
  );
}
export function AiProviderFields({ p }: { p: AiPanel }) {
  const t = useTranslations('settings.ai');
  const row = p.form?.providers.find((r) => r.id === p.selected);
  if (!row) return null;
  const catalog = AI_PROVIDER_CATALOG[row.id];
  const set = (patch: Parameters<AiPanel['provider']>[1]) => p.provider(row.id, patch);
  return (
    <div className={styles.fields}>
      <AiKeyField p={p} />
      <label>
        {t('model')}
        {row.id === 'custom' ? (
          <input
            value={row.model}
            placeholder={t('customModel')}
            disabled={p.busy}
            onChange={(e) => set({ model: e.target.value })}
          />
        ) : (
          <select
            value={row.model}
            disabled={p.busy}
            onChange={(e) => set({ model: e.target.value })}
          >
            {catalog.models.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        )}
      </label>
      <label>
        {t('url')}
        <input
          value={row.baseUrl}
          placeholder="https://…/v1"
          disabled={p.busy}
          onChange={(e) => set({ baseUrl: e.target.value })}
        />
      </label>
      {(['priceIn', 'priceOut'] as const).map((key) => (
        <label key={key}>
          {t(key)}
          <input
            type="number"
            min={0}
            max={1e9}
            value={row[key]}
            disabled={p.busy}
            onChange={(e) => set({ [key]: Number(e.target.value) })}
          />
        </label>
      ))}
    </div>
  );
}
