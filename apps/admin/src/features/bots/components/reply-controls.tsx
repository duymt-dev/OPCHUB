'use client';

import type { BotReplyOverview, BotReplySettings } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { ReplyHeading } from './reply-heading';
import { ReplyRun } from './reply-run';
import { ReplyNumberField } from './reply-number-field';
import styles from './reply-panel.module.css';

interface Props {
  data: BotReplyOverview;
  groupCount: number;
  disabled: boolean;
  error: string | null;
  fields: { path: string; message: string }[];
  onPatch: (patch: Partial<BotReplySettings>) => void;
  onScan: () => void;
  onStop: (id: string) => void;
}

export function ReplyControls({
  data,
  groupCount,
  disabled,
  error,
  fields,
  onPatch,
  onScan,
  onStop,
}: Props) {
  const t = useTranslations('bots.replies');
  const running = data.run?.status === 'running';
  return (
    <section className={`${styles.box} ${styles.controls}`} aria-label={t('title')}>
      <ReplyHeading data={data} groupCount={groupCount} disabled={disabled} onPatch={onPatch} />
      <div className={styles.form}>
        <ReplyNumberField
          name="sampleSize"
          value={data.settings.sampleSize}
          max={200}
          disabled={disabled}
          error={fields.find((f) => f.path === 'sampleSize')?.message}
          onSave={(sampleSize) => onPatch({ sampleSize })}
        />
        <ReplyNumberField
          name="delaySeconds"
          value={data.settings.delaySeconds}
          max={600}
          disabled={disabled}
          error={fields.find((f) => f.path === 'delaySeconds')?.message}
          onSave={(delaySeconds) => onPatch({ delaySeconds })}
        />
        <button
          className={running ? styles.stop : styles.primary}
          type="button"
          disabled={disabled}
          aria-label={running ? t('stop') : t('scan')}
          onClick={() => (running && data.run ? onStop(data.run.id) : onScan())}
        >
          {t(running ? 'stopShort' : 'scan')}
        </button>
      </div>
      <ReplyRun run={data.run} />
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
