'use client';

import { CAMPAIGN_AUDIENCE, type MailTemplate } from '@opchub/shared/api-domains';
import { RichTextField } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useGroupOptions } from '../hooks/use-marketing';
import { applyTemplate, fmtN, toggleGroup } from '../model';
import { MAIL_VARS, type CampaignFormState } from '../types';
import styles from './campaign-form.module.css';

interface FieldProps {
  f: CampaignFormState;
  set: (p: Partial<CampaignFormState>) => void;
}

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

export function NameField({ f, set }: FieldProps) {
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
        onChange={(e) => set({ name: e.target.value })}
      />
    </label>
  );
}

/** Đối tượng nhận + chọn nhóm + "Ước tính N người nhận" */
export function AudienceField({ f, set, estimate }: FieldProps & { estimate: number | undefined }) {
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
        <div className={styles.groups} role="group" aria-label={t('groupsLabel')}>
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
      <span className={styles.estimate} aria-live="polite">
        {t('estimate', { n: fmtN(estimate ?? 0) })}
      </span>
    </div>
  );
}

export function SubjectField({ f, set }: FieldProps) {
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
        onChange={(e) => set({ subject: e.target.value })}
      />
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
  const t = useTranslations('marketing.form');
  return (
    <div className={styles.field}>
      {t('body')}
      <RichTextField
        key={rev}
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

export function ScheduleField({ f, set }: FieldProps) {
  const t = useTranslations('marketing.form');
  return (
    <label className={styles.field}>
      {t('at')}
      <input
        type="datetime-local"
        className={styles.input}
        value={f.at}
        onChange={(e) => set({ at: e.target.value })}
      />
    </label>
  );
}
