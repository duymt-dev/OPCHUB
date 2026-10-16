'use client';

import { INVESTOR_KINDS } from '@opchub/shared/api-domains';
import type { ProjectDetail } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useSendInterest } from '../hooks/use-send-interest';
import { money, validateInterest } from '../model';
import base from './form.module.css';
import styles from './dialogs.module.css';
import { Dialog } from './overlay';

type Kind = (typeof INVESTOR_KINDS)[number];

interface Values {
  kind: Kind;
  name: string;
  phone: string;
  org: string;
  amount: string;
  message: string;
}

function Req({ children }: { children: string }) {
  return (
    <span>
      <span className={base.req}>*</span> {children}
    </span>
  );
}

function KindPicker({ kind, onKind }: { kind: Kind; onKind: (k: Kind) => void }) {
  const t = useTranslations('projects.invest');
  const tk = useTranslations('projects.kind');
  return (
    <div className={base.field}>
      <Req>{t('kind')}</Req>
      <div className={styles.kinds} role="radiogroup">
        {INVESTOR_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            className={`${styles.kindBtn} ${kind === k ? styles.kindOn : ''}`}
            onClick={() => onKind(k)}
          >
            {tk(k)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Các trường của form quan tâm đầu tư */
function InvestFields({
  v,
  set,
  p,
}: {
  v: Values;
  set: (patch: Partial<Values>) => void;
  p: ProjectDetail;
}) {
  const t = useTranslations('projects.invest');
  const cur = p.funding?.currency ?? 'VND';
  const min = p.funding?.minTicket ?? 0;
  const nameLabel =
    v.kind === 'fund' ? t('nameFund') : v.kind === 'business' ? t('nameBiz') : t('name');
  return (
    <>
      <KindPicker kind={v.kind} onKind={(kind) => set({ kind })} />
      <div className={base.two}>
        <label className={base.field}>
          <Req>{nameLabel}</Req>
          <input
            className={base.input}
            value={v.name}
            placeholder={t('namePh')}
            onChange={(e) => set({ name: e.target.value })}
          />
        </label>
        <label className={base.field}>
          <Req>{t('phone')}</Req>
          <input
            className={base.input}
            value={v.phone}
            placeholder={t('phonePh')}
            onChange={(e) => set({ phone: e.target.value })}
          />
        </label>
      </div>
      {v.kind !== 'individual' ? (
        <label className={base.field}>
          <Req>{v.kind === 'fund' ? t('orgFund') : t('orgBiz')}</Req>
          <input
            className={base.input}
            value={v.org}
            placeholder={v.kind === 'fund' ? t('orgFundPh') : t('orgBizPh')}
            onChange={(e) => set({ org: e.target.value })}
          />
        </label>
      ) : null}
      <label className={base.field}>
        <Req>{t('amount', { cur })}</Req>
        <input
          type="number"
          min={0}
          className={base.input}
          value={v.amount}
          placeholder={min > 0 ? t('amountMinPh', { amount: money(min, cur) }) : t('amountPh')}
          onChange={(e) => set({ amount: e.target.value })}
        />
        <span className={base.amountText}>
          {Number(v.amount) > 0 ? `= ${money(Number(v.amount), cur)}` : ''}
        </span>
      </label>
      <label className={base.field}>
        {t('message')}
        <textarea
          rows={3}
          className={`${base.textarea} ${base.textareaPlain}`}
          value={v.message}
          placeholder={t('messagePh')}
          onChange={(e) => set({ message: e.target.value })}
        />
      </label>
    </>
  );
}

/** P-70 / P-71: Quan tâm đầu tư (BR-09) — gửi kèm Idempotency-Key */
export function InvestModal({ p, onClose }: { p: ProjectDetail; onClose: () => void }) {
  const t = useTranslations('projects.invest');
  const toast = useToast();
  const me = useAuthStore((s) => s.me?.fullName ?? '');
  const [v, setV] = useState<Values>({
    kind: 'individual',
    name: me,
    phone: '',
    org: '',
    amount: '',
    message: '',
  });
  const send = useSendInterest(p, onClose);
  const f = p.funding;
  if (!f) return null;

  const submit = () => {
    const err = validateInterest({ ...v, min: f.minTicket });
    if (err) return toast(t(`err.${err}`, { amount: money(f.minTicket, f.currency) }));
    if (send.isPending) return;
    send.mutate({
      kind: v.kind,
      contactName: v.name.trim(),
      phone: v.phone.trim(),
      organization: v.kind === 'individual' ? '' : v.org.trim(),
      amount: Math.round(Number(v.amount)),
      currency: f.currency,
      message: v.message.trim(),
    });
  };

  return (
    <Dialog
      open
      title={t('title', { name: p.name })}
      closeLabel={t('close')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={base.btn} onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="button" className={`${base.btn} ${styles.btnAmber}`} onClick={submit}>
            {t('submit')}
          </button>
        </>
      }
    >
      <div className={styles.notice}>
        {t.rich('summary', {
          amount: money(f.amount, f.currency),
          equity: `${f.equityPercent}%`,
          v: (c) => <span>{c}</span>,
        })}
      </div>
      <InvestFields v={v} p={p} set={(patch) => setV((s) => ({ ...s, ...patch }))} />
      <span className={base.hint}>{t('note')}</span>
    </Dialog>
  );
}
