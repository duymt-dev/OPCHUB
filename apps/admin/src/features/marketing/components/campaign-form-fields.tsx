'use client';

import { CAMPAIGN_AUDIENCE, type MailTemplate } from '@opchub/shared/api-domains';
import { FieldErrorOf, type FieldErrorProps, invalidProps, RichTextField } from '@opchub/ui';
import { useLocale, useTranslations } from 'next-intl';
import { useGroupOptions } from '../hooks/use-marketing';
import { applyTemplate, fmtN, toggleGroup } from '../model';
import { MAIL_VARS, type CampaignFormError, type CampaignFormState } from '../types';
import styles from './campaign-form.module.css';
import { AdminAiSuggestButton } from '@/components/ai-suggest-button';
import { useState } from 'react';
import { useAdminUiLabels } from '@/i18n/ui-labels';

interface FieldProps {
  f: CampaignFormState;
  set: (p: Partial<CampaignFormState>) => void;
}

/** Lỗi tại ô (BUG-022) */
type Err = { err: (k: CampaignFormError) => FieldErrorProps | undefined };

const Req = () => <span className={styles.req}>*</span>;

/** Lưới mẫu email: "Trống" + mẫu từ server; chọn mẫu điền sẵn tên, tiêu đề, nội dung */
export function TemplatePicker({
  f,
  templates,
  onPick,
}: {
  f: CampaignFormState;
  templates: MailTemplate[];
  onPick: (next: CampaignFormState) => void;
}) {
  const t = useTranslations('marketing.form');
  const items = [
    { id: '', label: t('blank'), hint: t('blankHint'), tpl: null },
    ...templates.map((x) => ({ id: x.id, label: x.label, hint: x.hint, tpl: x })),
  ];
  return (
    <div className={styles.field} role="group" aria-labelledby="mk-tpl">
      <span id="mk-tpl">{t('tpl')}</span>
      <span className={styles.hint}>{t('tplHint')}</span>
      <div className={styles.tpls}>
        {items.map((x) => (
          <button
            key={x.id || 'blank'}
            type="button"
            aria-pressed={f.tpl === x.id}
            className={`${styles.tpl} ${f.tpl === x.id ? styles.tplOn : ''}`}
            onClick={() => onPick(applyTemplate(f, x.tpl))}
          >
            <span className={styles.tplName}>{x.label}</span>
            <span className={styles.tplHint}>{x.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function NameField({ f, set, err }: FieldProps & Err) {
  const t = useTranslations('marketing.form');
  return (
    <label className={styles.field}>
      <span>
        <Req /> {t('name')}
      </span>
      <input
        className={styles.input}
        value={f.name}
        placeholder={t('namePh')}
        {...invalidProps(err('name'))}
        onChange={(e) => set({ name: e.target.value })}
      />
      <FieldErrorOf e={err('name')} />
    </label>
  );
}

/** Đối tượng nhận + chọn nhóm + "Ước tính N người nhận" */
export function AudienceField({
  f,
  set,
  err,
  estimate,
}: FieldProps & Err & { estimate: number | undefined }) {
  const locale = useLocale();
  const t = useTranslations('marketing.form');
  const groups = useGroupOptions(f.audience === 'groups').data ?? [];
  return (
    <div className={styles.field}>
      <span id="mk-aud">
        <Req /> {t('audience')}
      </span>
      <div className={styles.chips} role="radiogroup" aria-labelledby="mk-aud">
        {CAMPAIGN_AUDIENCE.map((a) => (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={f.audience === a}
            className={`${styles.aud} ${f.audience === a ? styles.audOn : ''}`}
            onClick={() => set({ audience: a })}
          >
            {t(`aud.${a}`)}
          </button>
        ))}
      </div>
      {f.audience === 'groups' ? (
        <div
          className={styles.groups}
          role="group"
          aria-label={t('groupsLabel')}
          {...invalidProps(err('groups'))}
        >
          {groups.map((g) => {
            const on = f.groupIds.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={on}
                className={`${styles.group} ${on ? styles.groupOn : ''}`}
                onClick={() => set({ groupIds: toggleGroup(f.groupIds, g.id) })}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      ) : null}
      <FieldErrorOf e={err('groups')} />
      <span className={styles.estimate} aria-live="polite">
        {t('estimate', { n: fmtN(estimate ?? 0, locale) })}
      </span>
    </div>
  );
}

export function SubjectField({ f, set, err }: FieldProps & Err) {
  const t = useTranslations('marketing.form');
  return (
    <label className={styles.field}>
      <span>
        <Req /> {t('subject')}
      </span>
      <input
        className={styles.input}
        value={f.subject}
        placeholder={t('subjectPh')}
        {...invalidProps(err('subject'))}
        onChange={(e) => set({ subject: e.target.value })}
      />
      <FieldErrorOf e={err('subject')} />
    </label>
  );
}

/** Nội dung (soạn thảo) + "Chèn biến"; `rev` đổi khi nội dung bị thay từ ngoài → dựng lại */
export function BodyField({
  f,
  set,
  rev,
  onInsert,
}: FieldProps & { rev: number; onInsert: (v: string) => void }) {
  const ui = useAdminUiLabels();
  const t = useTranslations('marketing.form');
  const [aiRevision, setAiRevision] = useState(0);
  return (
    <div className={styles.field}>
      {t('body')}
      <AdminAiSuggestButton
        input={{ title: f.subject.slice(0, 300), description: f.body.slice(0, 1500) }}
        apply={(body) => {
          set({ body });
          setAiRevision((value) => value + 1);
        }}
      />
      <RichTextField
        labels={ui.editor}
        key={`${rev}:${aiRevision}`}
        value={f.body}
        onChange={(body) => set({ body })}
        placeholder={t('bodyPh')}
        ariaLabel={t('body')}
        minHeight={160}
      />
      <div className={styles.vars}>
        <span className={styles.hint}>{t('vars')}</span>
        {MAIL_VARS.map((v) => (
          <button key={v} type="button" className={styles.var} onClick={() => onInsert(v)}>
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ScheduleField({ f, set, err }: FieldProps & Err) {
  const t = useTranslations('marketing.form');
  return (
    <label className={styles.field}>
      {t('at')}
      <input
        type="datetime-local"
        className={styles.input}
        value={f.at}
        {...invalidProps(err('at'))}
        onChange={(e) => set({ at: e.target.value })}
      />
      <FieldErrorOf e={err('at')} />
    </label>
  );
}
