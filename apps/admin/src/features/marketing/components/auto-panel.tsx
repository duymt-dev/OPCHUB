'use client';

import { welcomeMailSchema, type WelcomeMail } from '@opchub/shared/api-domains';
import { PageSkeleton, useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useWelcomeMail } from '../hooks/use-marketing';
import styles from './auto-panel.module.css';
import { OnboardingMailEditor } from './onboarding-mail';
import { AttachmentList, IncludeSwitches, RuleList } from './welcome-lists';
import { WelcomePreview } from './welcome-preview';

interface Props {
  onSave: (w: WelcomeMail) => void;
  onTest: (to: string) => void;
}

function Editor({ initial, onSave, onTest }: Props & { initial: WelcomeMail }) {
  const t = useTranslations('marketing');
  const toast = useToast();
  const me = useAuthStore((s) => s.me);
  const [w, setW] = useState(initial);
  const set = (p: Partial<WelcomeMail>) => setW((s) => ({ ...s, ...p }));

  const save = () => {
    // Bỏ dòng trống trước khi gửi; URL sai → báo lỗi thay vì 400
    const clean = {
      ...w,
      attachments: w.attachments.filter((a) => a.title.trim() || a.url.trim()),
      rules: w.rules.filter((r) => r.trim()),
    };
    const parsed = welcomeMailSchema.safeParse(clean);
    if (!parsed.success) return toast(t('auto.invalidUrl'));
    onSave(parsed.data);
  };

  return (
    <div className={styles.grid}>
      <div className={styles.col}>
        <div className={styles.top}>
          <div className={styles.topText}>
            <b>{t('auto.title')}</b>
            <span className={styles.muted}>{t('auto.hint')}</span>
          </div>
          <span className={styles.on}>{t('auto.on')}</span>
        </div>
        <label className={styles.field}>
          {t('auto.subject')}
          <input
            className={styles.input}
            value={w.subject}
            onChange={(e) => set({ subject: e.target.value })}
          />
        </label>
        <label className={styles.field}>
          {t('auto.intro')}
          <textarea
            className={styles.area}
            rows={3}
            value={w.intro}
            onChange={(e) => set({ intro: e.target.value })}
          />
        </label>
        <IncludeSwitches w={w} set={set} />
        <AttachmentList w={w} set={set} />
        <RuleList w={w} set={set} />
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btn}
            onClick={() => onTest(me?.email ?? 'admin@opchub.community')}
          >
            {t('auto.test')}
          </button>
          <button type="button" className={styles.primary} onClick={save}>
            {t('auto.save')}
          </button>
        </div>
      </div>
      <div className={styles.col}>
        <span className={styles.muted}>{t('auto.preview')}</span>
        <WelcomePreview tpl={w} name={t('mail.sampleName')} />
      </div>
    </div>
  );
}

/**
 * D-78 tab "Email tự động": mẫu email chào mừng (SRS §13 `GET/PUT /admin/mail/welcome`).
 * Dùng chung API với màn Cài đặt (làn khác) — xem Q-G6b-2.
 */
export function AutoPanel(props: Props) {
  const q = useWelcomeMail(true);
  if (!q.data) return <PageSkeleton />;
  return (
    <>
      <Editor key={q.dataUpdatedAt} initial={q.data} {...props} />
      <OnboardingMailEditor />
    </>
  );
}
