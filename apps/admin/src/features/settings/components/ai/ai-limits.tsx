'use client';
import { useTranslations } from 'next-intl';
import { Switch } from '../switch';
import type { AiPanel } from './types';
import styles from './ai.module.css';
export function AiLimits({ p }: { p: AiPanel }) {
  const t = useTranslations('settings.ai');
  const form = p.form;
  if (!form) return null;
  const spend = p.query.data?.spend;
  const cost = spend?.cost ?? 0;
  const pct = form.budget ? Math.min(100, Math.round((cost * 100) / form.budget)) : 0;
  const month = spend?.month.split('-').reverse().join('/') ?? '';
  return (
    <section className={styles.card}>
      <h2>{t('limits')}</h2>
      <div className={styles.limits}>
        {(['temperature', 'maxTokens', 'budget', 'warnPct'] as const).map((key) => (
          <label key={key}>
            {t(key)}
            <input
              type="number"
              value={form[key]}
              min={key === 'maxTokens' ? 16 : key === 'warnPct' ? 1 : 0}
              max={{ temperature: 1, maxTokens: 1024, budget: 1e12, warnPct: 100 }[key]}
              step={key === 'temperature' ? 0.1 : 1}
              disabled={p.busy}
              onChange={(e) => p.set({ [key]: Number(e.target.value) })}
            />
          </label>
        ))}
      </div>
      <div className={styles.row}>
        <span>{t('spend', { month })}</span>
        <span>
          {form.budget
            ? `${cost.toLocaleString('vi-VN')} / ${form.budget.toLocaleString('vi-VN')} · ${pct}%`
            : t('unlimited')}
        </span>
      </div>
      {form.budget > 0 && (
        <div className={styles.track}>
          <div
            style={{ width: `${pct}%`, background: pct >= form.warnPct ? '#FA8C16' : '#1677FF' }}
          />
        </div>
      )}
      <small>{t('exhausted')}</small>
      {(['log', 'pii'] as const).map((key) => (
        <div className={styles.row} key={key}>
          <div>
            <b>{t(key)}</b>
            <small>{t(`${key}Sub`)}</small>
          </div>
          <Switch
            on={form[key]}
            label={t(key)}
            disabled={p.busy}
            onChange={(v) => p.set({ [key]: v })}
          />
        </div>
      ))}
      <div className={styles.saveRow}>
        <button type="button" className={styles.primary} disabled={p.busy} onClick={p.submit}>
          {t('save')}
        </button>
      </div>
    </section>
  );
}
