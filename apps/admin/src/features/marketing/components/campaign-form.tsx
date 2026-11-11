'use client';

import type { CampaignSaveMode } from '@opchub/shared/api-domains';
import { translateErrors } from '@opchub/ui';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useFormErrors } from '@/lib/use-form-errors';
import { useEscape } from '../hooks/use-escape';
import { useEstimate, useMailTemplates } from '../hooks/use-marketing';
import { CAMPAIGN_FIELD_MAP, fmtN, validateCampaign } from '../model';
import type { CampaignFormError, CampaignFormState, ConfirmRequest } from '../types';
import {
  AudienceField,
  BodyField,
  NameField,
  ScheduleField,
  SubjectField,
  TemplatePicker,
} from './campaign-form-fields';
import styles from './campaign-form.module.css';
import ov from './overlay.module.css';

interface Props {
  /** null = đóng; còn lại là giá trị khởi tạo (trống hoặc bản sao) */
  initial: CampaignFormState | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (f: CampaignFormState, mode: CampaignSaveMode, onError: (e: unknown) => void) => void;
  onConfirm: (req: ConfirmRequest) => void;
}

function FormBody({
  initial,
  busy,
  onSubmit,
  onConfirm,
}: Omit<Props, 'onClose'> & { initial: CampaignFormState }) {
  const locale = useLocale();
  const t = useTranslations('marketing');
  const fe = useFormErrors<CampaignFormError>();
  const [f, setF] = useState(initial);
  /** Đổi khi nội dung bị thay từ ngoài (chọn mẫu, chèn biến) để dựng lại ô soạn thảo */
  const [rev, setRev] = useState(0);
  const set = (p: Partial<CampaignFormState>) => {
    setF((s) => ({ ...s, ...p }));
    fe.clear(...Object.keys(p), ...('groupIds' in p || 'audience' in p ? ['groups'] : []));
  };
  const onError = (e: unknown) => fe.fromApi(e, CAMPAIGN_FIELD_MAP, t('errors.failed'));
  const templates = useMailTemplates(true).data ?? [];
  const estimate = useEstimate(f.audience, f.groupIds, true).data;

  const save = (mode: CampaignSaveMode) => {
    if (fe.check(translateErrors(validateCampaign(f, mode), (e) => t(`errors.${e}`)))) return;
    if (busy) return;
    if (mode !== 'send') return onSubmit(f, mode, onError);
    // Gửi ngay không hoàn tác → xác nhận (luật 10)
    onConfirm({
      title: t('confirm.sendTitle'),
      body: t('confirm.sendBody', { name: f.name.trim(), n: fmtN(estimate ?? 0, locale) }),
      okLabel: t('confirm.sendOk'),
      cancelLabel: t('confirm.cancel'),
      danger: false,
      onOk: () => onSubmit(f, 'send', onError),
    });
  };

  return (
    <>
      <div className={styles.body}>
        <TemplatePicker
          f={f}
          templates={templates}
          onPick={(next) => {
            setF(next);
            fe.clear('name', 'subject');
            setRev((n) => n + 1);
          }}
        />
        <NameField f={f} set={set} err={fe.err} />
        <AudienceField f={f} set={set} err={fe.err} estimate={estimate} />
        <SubjectField f={f} set={set} err={fe.err} />
        <BodyField
          f={f}
          rev={rev}
          set={set}
          onInsert={(v) => {
            set({ body: `${f.body}${v}` });
            setRev((n) => n + 1);
          }}
        />
        <ScheduleField f={f} set={set} err={fe.err} />
      </div>
      <div className={ov.foot}>
        <button type="button" className={ov.btn} disabled={busy} onClick={() => save('draft')}>
          {t('form.draft')}
        </button>
        <button type="button" className={ov.btn} disabled={busy} onClick={() => save('schedule')}>
          {t('form.schedule')}
        </button>
        <button type="button" className={ov.primary} disabled={busy} onClick={() => save('send')}>
          {t('form.send')}
        </button>
      </div>
    </>
  );
}

/** D-79: ngăn kéo phải "Tạo chiến dịch email" (620px), tự vẽ — không motion antd */
export function CampaignForm(props: Props) {
  const t = useTranslations('marketing.form');
  const { initial, onClose } = props;
  useEscape(initial !== null, onClose);
  if (!initial) return null;
  return (
    <>
      <button
        type="button"
        className={ov.mask}
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
      />
      <div className={ov.sheet} role="dialog" aria-modal="true" aria-labelledby="mk-cf-head">
        <div className={ov.head}>
          <span id="mk-cf-head" className={ov.title}>
            {t('title')}
          </span>
          <button type="button" className={ov.x} aria-label={t('close')} onClick={onClose}>
            ×
          </button>
        </div>
        <FormBody
          initial={initial}
          busy={props.busy}
          onSubmit={props.onSubmit}
          onConfirm={props.onConfirm}
        />
      </div>
    </>
  );
}
