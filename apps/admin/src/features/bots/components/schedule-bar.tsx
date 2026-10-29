'use client';

import { useTranslations } from 'next-intl';
import type { BotScheduleControl } from '../types';
import styles from './schedule-bar.module.css';

const dateLabel = (date: string) => date.split('-').reverse().join('/');

export function ScheduleBar({
  control,
  enabled,
  disabled,
}: {
  control: BotScheduleControl;
  enabled: boolean;
  disabled: boolean;
}) {
  const t = useTranslations('bots.schedule');
  const { schedule } = control;
  const summary =
    schedule.fromDate || schedule.toDate
      ? t('range', {
          from: schedule.fromDate ? dateLabel(schedule.fromDate) : '…',
          to: schedule.toDate ? dateLabel(schedule.toDate) : t('unlimited'),
        })
      : t('continuous');
  const paused = schedule.paused || !enabled;
  return (
    <section className={styles.box} aria-label={t('title')}>
      <div className={styles.row}>
        <div className={styles.caption}>
          <b>{t('title')}</b>
          <span>{summary}</span>
        </div>
        {(['fromDate', 'toDate'] as const).map((key) => {
          const error = control.fields.find((field) => field.path === key)?.message;
          return (
            <label className={styles.field} key={key}>
              <span>{t(key)}</span>
              <input
                type="date"
                value={schedule[key] ?? ''}
                disabled={disabled}
                aria-invalid={!!error}
                aria-describedby={error ? `bot-${key}-error` : undefined}
                onChange={(event) => control.onPatch({ [key]: event.target.value || null })}
              />
              {error && (
                <span id={`bot-${key}-error`} className={styles.error}>
                  {error}
                </span>
              )}
            </label>
          );
        })}
        <button
          type="button"
          className={styles.button}
          disabled={disabled}
          onClick={() => control.onPatch({ fromDate: null, toDate: null })}
        >
          {t('clear')}
        </button>
        <button
          type="button"
          className={`${styles.button} ${paused ? styles.resume : styles.pause}`}
          disabled={disabled}
          onClick={control.onToggle}
        >
          {t(paused ? 'resume' : 'pause')}
        </button>
      </div>
      {control.error && (
        <p role="alert" className={styles.error}>
          {control.error}
        </p>
      )}
    </section>
  );
}
