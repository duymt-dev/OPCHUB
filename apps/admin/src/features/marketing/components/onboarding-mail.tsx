'use client';

import { type OnboardingMail, onboardingMailSchema } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { fetchOnboardingMail, marketingKeys, saveOnboardingMail } from '../api';
import styles from './auto-panel.module.css';

const VARS = ['ten', 'con_thieu', 'link'] as const;

function Form({ initial }: { initial: OnboardingMail }) {
  const t = useTranslations('marketing.onbMail');
  const toast = useToast();
  const qc = useQueryClient();
  const [m, setM] = useState(initial);
  const save = useMutation({
    mutationFn: saveOnboardingMail,
    onSuccess: (r) => {
      qc.setQueryData(marketingKeys.onboarding, r);
      toast(t('saved'));
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t('failed')),
  });
  const submit = () => {
    const parsed = onboardingMailSchema.safeParse(m);
    if (!parsed.success) return toast(t('invalid'));
    save.mutate(parsed.data);
  };
  return (
    <section className={styles.col} data-mail="onboarding" aria-labelledby="onb-mail-title">
      <div className={styles.topText}>
        <b id="onb-mail-title">{t('title')}</b>
        <span className={styles.muted}>{t('hint')}</span>
      </div>
      <label className={styles.field}>
        {t('subject')}
        <input
          className={styles.input}
          value={m.subject}
          onChange={(e) => setM((s) => ({ ...s, subject: e.target.value }))}
        />
      </label>
      <label className={styles.field}>
        {t('body')}
        <textarea
          className={styles.area}
          rows={6}
          value={m.body}
          onChange={(e) => setM((s) => ({ ...s, body: e.target.value }))}
        />
      </label>
      <span className={styles.muted}>
        {t('varsLabel')}{' '}
        {VARS.map((v, i) => (
          <span key={v}>
            {i ? ' · ' : ''}
            <code>{`{{${v}}}`}</code> {t(`var.${v}`)}
          </span>
        ))}
      </span>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} disabled={save.isPending} onClick={submit}>
          {t('save')}
        </button>
      </div>
    </section>
  );
}

/**
 * V4-611 (D-88) mẫu email nhắc hoàn tất hướng dẫn bắt đầu — `GET/PUT /admin/mail/onboarding`
 * (`settings.mail`, BE ghi audit). Đặt dưới mẫu email chào mừng ở tab "Email tự động".
 */
export function OnboardingMailEditor() {
  const q = useQuery({ queryKey: marketingKeys.onboarding, queryFn: fetchOnboardingMail });
  if (!q.data) return null;
  return (
    <div className={styles.section}>
      <Form key={q.dataUpdatedAt} initial={q.data} />
    </div>
  );
}
