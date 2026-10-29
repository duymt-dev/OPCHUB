'use client';

import type { StoreUpsert } from '@opchub/shared/api-domains';
import { provinces, STORE_FIELDS } from '@opchub/shared/fixtures';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { DraftPatch } from '../../hooks/use-store-wizard';
import { STORE_AUDIENCE_ORDER } from '../../model';
import f from './fields.module.css';

interface Props {
  draft: StoreUpsert;
  set: DraftPatch;
}

/** Nhãn ô + dấu * đỏ như prototype */
export function Label({ text, req }: { text: string; req?: boolean }) {
  return (
    <span>
      {text}
      {req ? <span className={f.req}> *</span> : null}
    </span>
  );
}

export function Field({
  label,
  req,
  children,
}: {
  label: string;
  req?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={f.field}>
      <Label text={label} req={req ?? false} />
      {children}
    </label>
  );
}

const PROVINCE_LIST = 'store-provinces';

/**
 * Bước 1 "Thông tin doanh nghiệp" (prototype :2026 → 2034): tên *, slogan, đối tượng (chip), ngành nghề *
 * (danh mục v4), tỉnh / thành * (ô nhập gợi ý 34 tỉnh — server kiểm), phường / xã.
 */
export function StepInfo({ draft, set }: Props) {
  const t = useTranslations('stores');
  const w = useTranslations('stores.wizard');
  // Ngành cũ ngoài danh mục vẫn hiện như prototype `inl`
  const fields = draft.field && !STORE_FIELDS.some((x) => x === draft.field) ? [draft.field] : [];
  return (
    <>
      <span className={f.h}>{w('steps.1')}</span>
      <Field label={w('name')} req>
        <input
          className={f.input}
          value={draft.name}
          placeholder={w('namePh')}
          onChange={(e) => set({ name: e.target.value })}
        />
      </Field>
      <Field label={w('slogan')}>
        <input
          className={f.input}
          value={draft.slogan}
          placeholder={w('sloganPh')}
          onChange={(e) => set({ slogan: e.target.value })}
        />
      </Field>
      <div className={f.field}>
        <span>{w('audience')}</span>
        <div className={f.chips}>
          {STORE_AUDIENCE_ORDER.map((a) => (
            <button
              key={a}
              type="button"
              className={f.chip}
              aria-pressed={draft.audience === a}
              onClick={() => set({ audience: a })}
            >
              {t(`audience.${a}`)}
            </button>
          ))}
        </div>
      </div>
      <Field label={w('field')} req>
        <select
          className={`${f.input} ${f.select}`}
          value={draft.field}
          onChange={(e) => set({ field: e.target.value })}
        >
          <option value="">{w('fieldPh')}</option>
          {[...STORE_FIELDS, ...fields].map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </Field>
      <div className={f.grid2}>
        <Field label={w('province')} req>
          <input
            className={f.input}
            value={draft.province}
            list={PROVINCE_LIST}
            placeholder={w('provincePh')}
            onChange={(e) => set({ province: e.target.value })}
          />
        </Field>
        <Field label={w('ward')}>
          <input
            className={f.input}
            value={draft.ward}
            placeholder={w('wardPh')}
            onChange={(e) => set({ ward: e.target.value })}
          />
        </Field>
      </div>
      <datalist id={PROVINCE_LIST}>
        {provinces.map(([name]) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </>
  );
}
