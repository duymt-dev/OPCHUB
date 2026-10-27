'use client';

import { useTranslations } from 'next-intl';
import {
  MEMBER_DAY_FILTERS,
  MEMBER_FEE_FILTERS,
  MEMBER_ONB_FILTERS,
  MEMBER_PROFILE_FILTERS,
  MEMBER_ROLE_FILTERS,
  MEMBER_STATUS_FILTERS,
  type GroupLookup,
  type MemberFilters,
} from '../types';
import styles from './member-filters.module.css';

interface Props {
  value: MemberFilters;
  groups: GroupLookup;
  /** Số kết quả khi đang lọc ("N kết quả") */
  total: number;
  onChange: (patch: Partial<MemberFilters>) => void;
}

interface Field {
  key: keyof MemberFilters;
  label: string;
  opts: { v: string; l: string }[];
  /** Giá trị hợp lệ → bản vá cho URL (không ép kiểu) */
  patch: (v: string) => Partial<MemberFilters> | null;
}

/** Bản vá một khoá lọc khi `v` thuộc danh sách cho phép */
function patcher<K extends keyof MemberFilters>(key: K, allowed: readonly MemberFilters[K][]) {
  return (v: string): Partial<MemberFilters> | null => {
    const hit = allowed.find((x) => x === v);
    if (hit === undefined) return null;
    const p: Partial<MemberFilters> = {};
    p[key] = hit;
    return p;
  };
}

const CLEARED: MemberFilters = {
  grp: '',
  role: '',
  fee: '',
  st: '',
  prof: '',
  day: '',
  onb: 'all',
};

/** Giá trị có nhãn riêng ('' / 'all' = "Tất cả") */
const isLabelled = <T extends string>(v: T): v is Exclude<T, '' | 'all'> => v !== '' && v !== 'all';

const isOn = (k: keyof MemberFilters, v: string) => (k === 'onb' ? v !== 'all' : v !== '');

/** 7 ô lọc theo thứ tự prototype `_mfVals` */
function useFilterFields(groups: GroupLookup): Field[] {
  const t = useTranslations('members.filters');
  const tOnb = useTranslations('members.onboarding');
  const opt = <T extends string>(
    list: readonly T[],
    label: (v: Exclude<T, '' | 'all'>) => string,
  ) => list.map((v) => ({ v, l: isLabelled(v) ? label(v) : t('all') }));
  const groupIds = ['', ...groups.list.map((g) => g.id)];
  return [
    {
      key: 'grp',
      label: t('grp'),
      opts: [{ v: '', l: t('all') }, ...groups.list.map((g) => ({ v: g.id, l: g.name }))],
      patch: patcher('grp', groupIds),
    },
    {
      key: 'role',
      label: t('role.label'),
      opts: opt(MEMBER_ROLE_FILTERS, (v) => t(`role.${v}`)),
      patch: patcher('role', MEMBER_ROLE_FILTERS),
    },
    {
      key: 'fee',
      label: t('fee.label'),
      opts: opt(MEMBER_FEE_FILTERS, (v) => t(`fee.${v}`)),
      patch: patcher('fee', MEMBER_FEE_FILTERS),
    },
    {
      key: 'st',
      label: t('st.label'),
      opts: opt(MEMBER_STATUS_FILTERS, (v) => t(`st.${v}`)),
      patch: patcher('st', MEMBER_STATUS_FILTERS),
    },
    {
      key: 'prof',
      label: t('prof.label'),
      opts: opt(MEMBER_PROFILE_FILTERS, (v) => t(`prof.${v}`)),
      patch: patcher('prof', MEMBER_PROFILE_FILTERS),
    },
    {
      key: 'day',
      label: t('day.label'),
      opts: opt(MEMBER_DAY_FILTERS, (v) => t(`day.${v}`)),
      patch: patcher('day', MEMBER_DAY_FILTERS),
    },
    {
      key: 'onb',
      label: tOnb('filter'),
      opts: opt(MEMBER_ONB_FILTERS, (v) => tOnb(`opt.${v}`)),
      patch: patcher('onb', MEMBER_ONB_FILTERS),
    },
  ];
}

/** Thanh lọc Thành viên — prototype v4 `mFilters` (7 select + "N kết quả" + "Xóa lọc (n)") */
export function MemberFiltersBar({ value, groups, total, onChange }: Props) {
  const t = useTranslations('members.filters');
  const fields = useFilterFields(groups);
  const n = fields.filter((f) => isOn(f.key, value[f.key])).length;
  return (
    <div className={styles.bar}>
      {fields.map((f) => (
        <label key={f.key} className={styles.field}>
          {f.label}
          <select
            className={styles.select}
            data-on={isOn(f.key, value[f.key]) ? '1' : '0'}
            value={value[f.key]}
            onChange={(e) => {
              const p = f.patch(e.target.value);
              if (p) onChange(p);
            }}
          >
            {f.opts.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
        </label>
      ))}
      {n > 0 ? (
        <div className={styles.result}>
          <span className={styles.count}>{t('results', { n: total })}</span>
          <button type="button" className={styles.clear} onClick={() => onChange(CLEARED)}>
            {t('clear', { n })}
          </button>
        </div>
      ) : null}
    </div>
  );
}
