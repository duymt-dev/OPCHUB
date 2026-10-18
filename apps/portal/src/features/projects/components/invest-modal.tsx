'use client';

import { INVESTOR_KINDS } from '@opchub/shared/api-domains';
import type { ProjectDetail } from '@opchub/shared/api-domains';
import { FieldErrorOf, type FieldErrorProps, invalidProps, translateErrors } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useFormErrors } from '@/lib/use-form-errors';
import { useSendInterest } from '../hooks/use-send-interest';
import { INTEREST_FIELD_MAP, type InterestField, money, validateInterest } from '../model';
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

type FieldsProps = {
  v: Values;
  set: (patch: Partial<Values>) => void;
  /** Lỗi tại ô (BUG-022) */
  err: (k: InterestField) => FieldErrorProps | undefined;
};

/** Họ tên (đổi nhãn theo loại NĐT) + SĐT */
function ContactPair({ v, set, err }: FieldsProps) {
  const t = useTranslations('projects.invest');
  const nameLabel =
    v.kind === 'fund' ? t('nameFund') : v.kind === 'business' ? t('nameBiz') : t('name');
  return (
    <div className={base.two}>
      <label className={base.field}>
        <Req>{nameLabel}</Req>
        <input
          className={base.input}
          value={v.name}
          placeholder={t('namePh')}
          {...invalidProps(err('name'))}
          onChange={(e) => set({ name: e.target.value })}
        />
        <FieldErrorOf e={err('name')} />
      </label>
      <label className={base.field}>
        <Req>{t('phone')}</Req>
        <input
          className={base.input}
          value={v.phone}
          placeholder={t('phonePh')}
          {...invalidProps(err('phone'))}
          onChange={(e) => set({ phone: e.target.value })}
        />
        <FieldErrorOf e={err('phone')} />
      </label>
    </div>
  );
}

/** Các trường của form quan tâm đầu tư */
function InvestFields({ v, set, p, err }: FieldsProps & { p: ProjectDetail }) {
  const t = useTranslations('projects.invest');
  const cur = p.funding?.currency ?? 'VND';
  const min = p.funding?.minTicket ?? 0;
  return (
    <>
      <KindPicker kind={v.kind} onKind={(kind) => set({ kind })} />
      <ContactPair v={v} set={set} err={err} />
      {v.kind !== 'individual' ? (
        <label className={base.field}>
          <Req>{v.kind === 'fund' ? t('orgFund') : t('orgBiz')}</Req>
          <input
            className={base.input}
            value={v.org}
            placeholder={v.kind === 'fund' ? t('orgFundPh') : t('orgBizPh')}
            {...invalidProps(err('org'))}
            onChange={(e) => set({ org: e.target.value })}
          />
          <FieldErrorOf e={err('org')} />
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
          {...invalidProps(err('amount'))}
          onChange={(e) => set({ amount: e.target.value })}
        />
        <FieldErrorOf e={err('amount')} />
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
  const tf = useTranslations('projects.toast');
  const fe = useFormErrors<InterestField>();
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
    const amount = money(f.minTicket, f.currency);
    const errs = validateInterest({ ...v, min: f.minTicket });
    if (fe.check(translateErrors(errs, (e) => t(`err.${e}`, { amount })))) return;
    if (send.isPending) return;
    const onError = (e: unknown) => fe.fromApi(e, INTEREST_FIELD_MAP, tf('failed'));
    send.mutate(
      {
        kind: v.kind,
        contactName: v.name.trim(),
        phone: v.phone.trim(),
        organization: v.kind === 'individual' ? '' : v.org.trim(),
        amount: Math.round(Number(v.amount)),
        currency: f.currency,
        message: v.message.trim(),
      },
      { onError },
    );
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
      <InvestFields
        v={v}
        p={p}
        err={fe.err}
        set={(patch) => {
          setV((s) => ({ ...s, ...patch }));
          fe.clear(...Object.keys(patch), ...('kind' in patch ? ['org'] : []));
        }}
      />
      <span className={base.hint}>{t('note')}</span>
    </Dialog>
  );
}
