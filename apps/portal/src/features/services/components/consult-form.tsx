'use client';

import type { ServiceRequest } from '@opchub/shared/api-domains';
import { FieldErrorOf, PageSkeleton } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useConsultForm, useServices } from '../hooks/use-consult-form';
import type { RequesterKind } from '../types';
import styles from './consult-form.module.css';
import { BizSection, ContactAndNeed, PersonalSection } from './consult-sections';
import { Row, Select } from './form-fields';
import { LocalizedRichTextField } from '@/i18n/localized-ui';

interface Props {
  svcId: string;
  onCancel: () => void;
  onSent: (r: ServiceRequest) => void;
}

/** P-80 → P-82: "Đăng ký tư vấn dịch vụ" (Cá nhân / Doanh nghiệp, lỗi tại ô — BUG-022) */
export function ConsultForm({ svcId, onCancel, onSent }: Props) {
  const t = useTranslations('services.form');
  const services = useServices();
  const { form, set, submit, err } = useConsultForm(svcId, onSent);
  if (!form) return <PageSkeleton />;

  const kinds: [RequesterKind, string][] = [
    ['per', t('kindPer')],
    ['biz', t('kindBiz')],
  ];
  const options = (services.data ?? []).map((s) => [s.id, s.name] as [string, string]);

  return (
    <div className={styles.form}>
      <div className={styles.head}>
        <span className={styles.title}>{t('title')}</span>
        <span className={styles.lead}>{t('lead')}</span>
      </div>
      <div className={styles.rows}>
        <Row label={t('service')}>
          <Select
            form={form}
            name="svc"
            set={set}
            label={t('service')}
            placeholder={null}
            options={options}
          />
        </Row>
        <Row label={t('kind')}>
          <div className={styles.kinds} role="radiogroup" aria-label={t('kind')}>
            {kinds.map(([k, l]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={form.kind === k}
                className={styles.kind}
                onClick={() => set('kind', k)}
              >
                <span className={styles.dot} aria-hidden="true">
                  <span />
                </span>
                {l}
              </button>
            ))}
          </div>
        </Row>
        {form.kind === 'biz' ? (
          <BizSection form={form} set={set} err={err} />
        ) : (
          <PersonalSection form={form} set={set} err={err} />
        )}
        <ContactAndNeed form={form} set={set} err={err} />
        <div className={styles.note}>
          <span className={styles.noteLabel}>
            {t('note')} <span className={styles.req}>*</span>
          </span>
          <LocalizedRichTextField
            key={svcId}
            value={form.note}
            placeholder={t('notePh')}
            ariaLabel={t('note')}
            minHeight={90}
            errorId={err('note')?.id}
            onChange={(v) => set('note', v)}
          />
          <FieldErrorOf e={err('note')} />
        </div>
      </div>
      <div className={styles.foot}>
        <span className={styles.privacy}>{t('privacy')}</span>
        <button type="button" className={styles.cancel} onClick={onCancel}>
          {t('cancel')}
        </button>
        <button type="button" className={styles.submit} onClick={submit}>
          {t('submit')}
        </button>
      </div>
    </div>
  );
}
