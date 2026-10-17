'use client';

import type { CampaignSaveMode } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useEscape } from '../hooks/use-escape';
import { useEstimate, useMailTemplates } from '../hooks/use-marketing';
import { fmtN, validateCampaign } from '../model';
import type { CampaignFormState, ConfirmRequest } from '../types';
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
  onSubmit: (f: CampaignFormState, mode: CampaignSaveMode) => void;
  onConfirm: (req: ConfirmRequest) => void;
}

function FormBody({
  initial,
  busy,
  onSubmit,
  onConfirm,
}: Omit<Props, 'onClose'> & { initial: CampaignFormState }) {
  const t = useTranslations('marketing');
  const toast = useToast();
  const [f, setF] = useState(initial);
  /** Đổi khi nội dung bị thay từ ngoài (chọn mẫu, chèn biến) để dựng lại ô soạn thảo */
  const [rev, setRev] = useState(0);
  const set = (p: Partial<CampaignFormState>) => setF((s) => ({ ...s, ...p }));
  const templates = useMailTemplates(true).data ?? [];
  const estimate = useEstimate(f.audience, f.groupIds, true).data;

  const save = (mode: CampaignSaveMode) => {
    const err = validateCampaign(f, mode);
    if (err) return toast(t(`errors.${err}`));
    if (busy) return;
    if (mode !== 'send') return onSubmit(f, mode);
    // Gửi ngay không hoàn tác → xác nhận (luật 10)
    onConfirm({
      title: t('confirm.sendTitle'),
      body: t('confirm.sendBody', { name: f.name.trim(), n: fmtN(estimate ?? 0) }),
      okLabel: t('confirm.sendOk'),
      danger: false,
      onOk: () => onSubmit(f, 'send'),
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
            setRev((n) => n + 1);
          }}
        />
        <NameField f={f} set={set} />
        <AudienceField f={f} set={set} estimate={estimate} />
        <SubjectField f={f} set={set} />
        <BodyField
          f={f}
          rev={rev}
          set={set}
          onInsert={(v) => {
            set({ body: `${f.body}${v}` });
            setRev((n) => n + 1);
          }}
        />
        <ScheduleField f={f} set={set} />
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
