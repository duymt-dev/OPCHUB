'use client';

import type { WelcomeMail } from '@opchub/shared/api-domains';
import { Icon } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import styles from './welcome-mail.module.css';
import { useNumberText } from '@/i18n/use-number-text';

interface Props {
  mail: WelcomeMail;
  edit: (p: Partial<WelcomeMail>) => void;
}

/** Tài liệu đính kèm (tiêu đề + URL), "Bổ sung tài liệu đính kèm" — D-70 */
export function AttachmentsEditor({ mail, edit }: Props) {
  const numberText = useNumberText();
  const t = useTranslations('settings.mail');
  const atts = mail.attachments;
  const setAtt = (i: number, p: Partial<WelcomeMail['attachments'][number]>) =>
    edit({ attachments: atts.map((a, j) => (j === i ? { ...a, ...p } : a)) });
  return (
    <div className={styles.group}>
      <div className={styles.groupHead}>
        <span className={styles.grow}>{t('attachments')}</span>
        <span className={styles.count}>{t('attCount', { n: numberText(atts.length) })}</span>
      </div>
      {atts.map((a, i) => (
        <div key={i} className={styles.attRow}>
          <span className={styles.n}>{numberText(i + 1)}</span>
          <input
            className={styles.input}
            value={a.title}
            placeholder={t('attTitle')}
            aria-label={t('attTitle')}
            onChange={(e) => setAtt(i, { title: e.target.value })}
          />
          <input
            className={styles.input}
            value={a.url}
            placeholder={t('attUrl')}
            aria-label={t('attUrl')}
            onChange={(e) => setAtt(i, { url: e.target.value })}
          />
          <button
            type="button"
            title={t('attRemove')}
            aria-label={t('attRemove')}
            className={styles.x32}
            onClick={() => edit({ attachments: atts.filter((_, j) => j !== i) })}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className={styles.dashed}
        onClick={() => edit({ attachments: [...atts, { title: '', url: '' }] })}
      >
        <Icon name="paperclip" size={14} />
        {t('addAtt')}
      </button>
    </div>
  );
}

/** Quy định hoạt động, "+ Thêm quy định" — D-70 */
export function RulesEditor({ mail, edit }: Props) {
  const numberText = useNumberText();
  const t = useTranslations('settings.mail');
  return (
    <div className={styles.group}>
      {t('rules')}
      {mail.rules.map((r, i) => (
        <div key={i} className={styles.ruleRow}>
          <span className={styles.n}>{numberText(i + 1)}</span>
          <input
            className={styles.input}
            value={r}
            aria-label={t('rule', { n: numberText(i + 1) })}
            onChange={(e) =>
              edit({ rules: mail.rules.map((x, j) => (j === i ? e.target.value : x)) })
            }
          />
          <button
            type="button"
            aria-label={t('ruleRemove', { n: numberText(i + 1) })}
            className={styles.x28}
            onClick={() => edit({ rules: mail.rules.filter((_, j) => j !== i) })}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className={styles.dashed}
        onClick={() => edit({ rules: [...mail.rules, ''] })}
      >
        {t('addRule')}
      </button>
    </div>
  );
}
