'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useId } from 'react';
import { useFundraisingPopupModel } from '../hooks/use-fundraising-popup-model';
import { useFundraisingPopup } from '../store';
import { FundraisingPay } from './fundraising-pay';
import { FundraisingPick } from './fundraising-pick';
import type { PickableProject } from './project-pick';
import styles from './fundraising.module.css';

interface Props {
  /** Dự án của tôi (chế độ chọn dự án) — truyền từ khung để feature không import projects */
  projects: readonly PickableProject[];
  onNewProject: () => void;
}

/**
 * Prototype v4.2 `Popup · Gói Gọi vốn` (UI-PAY-01 → 04, D-96): 2 cột — (1) chọn dự án + tổng tiền + lưu ý,
 * (2) chuyển khoản QR VietQR + bảng ngân hàng; × góc + "Quay lại". D-94 4B: một dự án / khoản.
 * "Tôi đã chuyển khoản" chỉ ghi nhận (D-31).
 */
export function FundraisingPopup({ projects, onNewProject }: Props) {
  const { open, projectId, projectName, hide } = useFundraisingPopup();
  if (!open) return null;
  const options = projects.filter((p) => p.canBuy);
  // Chế độ chọn dự án: đợi danh sách dự án rồi mới dựng (chọn sẵn dự án đầu như prototype)
  return (
    <Popup
      key={`${projectId ?? 'pick'}:${options[0]?.id ?? ''}`}
      projectId={projectId}
      projectName={projectName}
      options={options}
      onClose={hide}
      onNewProject={onNewProject}
    />
  );
}

function Popup({
  projectId,
  projectName,
  options,
  onClose: hide,
  onNewProject,
}: {
  projectId: string | null;
  projectName: string;
  options: readonly PickableProject[];
  onClose: () => void;
  onNewProject: () => void;
}) {
  const t = useTranslations('projects.fundPlan');
  const titleId = useId();
  const m = useFundraisingPopupModel(projectId, options, hide);
  const { pick, f } = m;

  return (
    <>
      <div className={styles.mask} aria-hidden="true" onClick={hide} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-screen-label="Popup · Gói Gọi vốn"
        className={styles.dialog}
      >
        <PopupHead
          titleId={titleId}
          title={t('title', { unit: m.unit })}
          sub={
            pick ? t('subPick') : t.rich('subPosted', { name: projectName, b: (c) => <b>{c}</b> })
          }
          closeLabel={t('close')}
          onClose={hide}
        />
        <div className={styles.body}>
          <FundraisingPick
            pick={pick}
            options={options}
            selected={m.selected}
            amountText={m.amountText}
            feeOf={m.feeOf}
            onSelect={m.setSelected}
            onNew={() => {
              hide();
              onNewProject();
            }}
          />
          <FundraisingPay pay={f.pay} amountText={m.amountText} error={f.error} onCopy={m.copy} />
        </div>
        <div className={styles.foot}>
          <button type="button" className={styles.later} onClick={hide}>
            {t('later')}
          </button>
          <button
            type="button"
            className={styles.done}
            disabled={f.confirm.isPending || f.loading}
            onClick={m.done}
          >
            {t('done')}
          </button>
        </div>
      </div>
    </>
  );
}

function PopupHead(props: {
  titleId: string;
  title: string;
  sub: ReactNode;
  closeLabel: string;
  onClose: () => void;
}) {
  return (
    <div className={styles.head}>
      <div className={styles.headText}>
        <span id={props.titleId} className={styles.title}>
          {props.title}
        </span>
        <span className={styles.sub}>{props.sub}</span>
      </div>
      <button
        type="button"
        className={styles.close}
        aria-label={props.closeLabel}
        onClick={props.onClose}
      >
        ×
      </button>
    </div>
  );
}
