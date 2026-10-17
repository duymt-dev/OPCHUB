'use client';

import type { WelcomeMail } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import styles from './auto-panel.module.css';

interface Props {
  w: WelcomeMail;
  set: (p: Partial<WelcomeMail>) => void;
}

/** D-47: bỏ công tắc "Tài khoản & mật khẩu truy cập" */
const SWITCHES = ['showRules', 'showGuide'] as const;

/** "Nội dung kèm theo": 3 công tắc */
export function IncludeSwitches({ w, set }: Props) {
  const t = useTranslations('marketing.auto');
  return (
    <div className={styles.group}>
      {t('include')}
      {SWITCHES.map((k) => (
        <button
          key={k}
          type="button"
          role="switch"
          aria-checked={w[k]}
          className={styles.switch}
          onClick={() => set({ [k]: !w[k] })}
        >
          <span className={`${styles.track} ${w[k] ? styles.trackOn : ''}`}>
            <span className={styles.knob} />
          </span>
          {t(k)}
        </button>
      ))}
    </div>
  );
}

export function AttachmentList({ w, set }: Props) {
  const t = useTranslations('marketing.auto');
  const atts = w.attachments;
  const put = (i: number, p: Partial<(typeof atts)[number]>) =>
    set({ attachments: atts.map((a, j) => (j === i ? { ...a, ...p } : a)) });
  return (
    <div className={styles.group}>
      <div className={styles.attHead}>
        <span>{t('atts')}</span>
        <span className={styles.muted}>{t('attN', { n: atts.length })}</span>
      </div>
      {atts.map((a, i) => (
        <div key={i} className={styles.att}>
          <span className={styles.num}>{i + 1}</span>
          <input
            className={styles.input}
            value={a.title}
            placeholder={t('attTitle')}
            aria-label={t('attTitle')}
            onChange={(e) => put(i, { title: e.target.value })}
          />
          <input
            className={styles.input}
            value={a.url}
            placeholder={t('attUrl')}
            aria-label={t('attUrl')}
            onChange={(e) => put(i, { url: e.target.value })}
          />
          <button
            type="button"
            className={styles.rm}
            title={t('attRm')}
            aria-label={t('attRm')}
            onClick={() => set({ attachments: atts.filter((_, j) => j !== i) })}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className={styles.add}
        onClick={() => set({ attachments: [...atts, { title: '', url: '' }] })}
      >
        {t('addAtt')}
      </button>
    </div>
  );
}

export function RuleList({ w, set }: Props) {
  const t = useTranslations('marketing.auto');
  return (
    <div className={styles.group}>
      {t('rules')}
      {w.rules.map((r, i) => (
        <div key={i} className={styles.rule}>
          <span className={styles.num}>{i + 1}</span>
          <input
            className={styles.input}
            value={r}
            aria-label={t('ruleN', { n: i + 1 })}
            onChange={(e) => set({ rules: w.rules.map((x, j) => (j === i ? e.target.value : x)) })}
          />
          <button
            type="button"
            className={styles.rm}
            aria-label={t('ruleRm', { n: i + 1 })}
            onClick={() => set({ rules: w.rules.filter((_, j) => j !== i) })}
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className={styles.add} onClick={() => set({ rules: [...w.rules, ''] })}>
        {t('addRule')}
      </button>
    </div>
  );
}
