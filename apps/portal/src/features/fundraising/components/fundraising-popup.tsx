'use client';

import type { FundraisingPayment } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { usePrices } from '@/lib/use-prices';
import { useFundraisingPay } from '../hooks/use-fundraising-pay';
import { useFundraisingPopup } from '../store';
import { ProjectPick, type PickableProject } from './project-pick';
import styles from './fundraising.module.css';

const vnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(n)}đ`;

interface Props {
  /** Dự án của tôi (chế độ chọn dự án) — truyền từ khung để feature không import projects */
  projects: readonly PickableProject[];
  onNewProject: () => void;
}

/**
 * V4-610 prototype `Popup · Gói Gọi vốn`: tài khoản nhận + nội dung CK có mã `GV`; "Để sau" đóng,
 * "Tôi đã chuyển khoản" ghi nhận (D-31). Không QR (prototype chỉ có ở phí thành viên).
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
  const toast = useToast();
  const titleId = useId();
  const pick = projectId === null;
  const [selected, setSelected] = useState<string | null>(
    pick ? (options[0]?.id ?? null) : projectId,
  );
  const f = useFundraisingPay(selected, hide);

  const done = () => {
    if (!f.pay) return toast(t('pickRequired'));
    f.confirm.mutate(f.pay.id);
  };
  const copy = async (text: string) => {
    await navigator.clipboard?.writeText(text).catch(() => undefined);
    toast(t('copied'));
  };

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
        <div className={styles.head}>
          <span id={titleId} className={styles.title}>
            {t('title')}
          </span>
          <span className={styles.sub}>
            {pick ? t('subPick') : t.rich('subPosted', { name: projectName, b: (c) => <b>{c}</b> })}
          </span>
        </div>
        <div className={styles.body}>
          {pick ? (
            <ProjectPick
              options={options}
              value={selected}
              onChange={setSelected}
              onNew={() => {
                hide();
                onNewProject();
              }}
            />
          ) : null}
          <PaymentGrid pay={f.pay} onCopy={(text) => void copy(text)} />
          {f.error ? <span className={styles.error}>{f.error}</span> : null}
          <div className={styles.note}>{t('note')}</div>
        </div>
        <div className={styles.foot}>
          <button type="button" className={styles.later} onClick={hide}>
            {t('later')}
          </button>
          <button
            type="button"
            className={styles.done}
            disabled={f.confirm.isPending || f.loading}
            onClick={done}
          >
            {t('done')}
          </button>
        </div>
      </div>
    </>
  );
}

function PaymentGrid({
  pay,
  onCopy,
}: {
  pay: FundraisingPayment | null;
  onCopy: (text: string) => void;
}) {
  const t = useTranslations('projects.fundPlan');
  const fund = usePrices()?.fund;
  // Số tiền của khoản (server chốt theo Cấu hình bảng giá); chưa có khoản → giá cấu hình hiện hành
  const value = pay?.amount ?? fund?.p;
  const amount =
    value !== undefined && fund ? t('amountValue', { amount: vnd(value), months: fund.mo }) : '—';
  return (
    <>
      <div className={styles.grid}>
        <span className={styles.k}>{t('amount')}</span>
        <b className={styles.amount}>{amount}</b>
        <span className={styles.k}>{t('bank')}</span>
        <span>{pay?.bank.bankName ?? '—'}</span>
        <span className={styles.k}>{t('accountNo')}</span>
        <b>{pay?.bank.accountNo ?? '—'}</b>
        <span className={styles.k}>{t('accountName')}</span>
        <span>{pay?.bank.accountName ?? '—'}</span>
        <span className={styles.k}>{t('content')}</span>
        <span className={styles.codeRow}>
          <b className={styles.code}>{pay?.transferContent ?? '—'}</b>
          {pay ? (
            <button
              type="button"
              className={styles.copy}
              onClick={() => onCopy(pay.transferContent)}
            >
              {t('copy')}
            </button>
          ) : null}
        </span>
      </div>
      {/* §28.1 (D-105): cấu trúc nội dung CK như prototype v4.2 */}
      <span className={styles.structure}>{t.rich('structure', { b: (c) => <b>{c}</b> })}</span>
    </>
  );
}
