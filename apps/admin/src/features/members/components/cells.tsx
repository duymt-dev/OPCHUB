'use client';

import type { AdminMember } from '@opchub/shared/api-domains';
import { colorOf } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { flagSrc, memberInitials } from '../model';
import type { GroupChip } from '../types';
import styles from './cells.module.css';

/** Avatar chữ viết tắt — màu theo tên (avc của prototype) là dữ liệu, không phải token */
export function MemberAvatar({ name, size }: { name: string; size: 32 | 56 }) {
  return (
    <span
      aria-hidden
      className={`${styles.avatar} ${size === 32 ? styles.av32 : styles.av56}`}
      style={{ background: colorOf(name) }}
    >
      {memberInitials(name)}
    </span>
  );
}

export function Flag({ country, large }: { country: string; large?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- D-36: ảnh cờ mẫu, tự host sau
    <img
      className={`${styles.flag} ${large ? styles.flagLg : styles.flagSm}`}
      src={flagSrc(country)}
      alt=""
    />
  );
}

export function TypeTag({ m, long }: { m: AdminMember; long?: boolean }) {
  const t = useTranslations('members.type');
  const biz = m.accountType === 'business';
  const label = biz ? (long ? t('businessLong') : t('business')) : t('personal');
  return <span className={`${styles.typeTag} ${biz ? styles.biz : styles.per}`}>{label}</span>;
}

/** Trạng thái hiển thị: khoá > chờ xác minh DN (D-40) > hoạt động — như công thức prototype */
export type StatusKind = 'locked' | 'pending' | 'active';
export const statusKind = (m: AdminMember): StatusKind =>
  m.status === 'locked' ? 'locked' : m.business?.verification === 'pending' ? 'pending' : 'active';

export function useStatusLabel() {
  const t = useTranslations('members');
  return (m: AdminMember) => {
    const k = statusKind(m);
    return k === 'pending' ? t('drawer.pending') : t(`status.${k}`);
  };
}

export function StatusPill({ m, className }: { m: AdminMember; className?: string | undefined }) {
  const label = useStatusLabel();
  return (
    <span className={`${className ?? styles.status} ${styles[statusKind(m)]}`}>{label(m)}</span>
  );
}

export function GroupChips({
  chips,
  more,
  chipClass,
}: {
  chips: GroupChip[];
  more: number;
  chipClass?: string | undefined;
}) {
  return (
    <div className={styles.chips}>
      {chips.map((g) => (
        <span
          key={g.id}
          className={chipClass ?? styles.chip}
          style={{ background: g.bg, color: g.fg }}
        >
          {g.name}
        </span>
      ))}
      {more > 0 ? <span className={chipClass ?? styles.more}>+{more}</span> : null}
    </div>
  );
}

export function CheckBox({
  state,
  label,
  onToggle,
}: {
  state: 'none' | 'some' | 'all';
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === 'all' ? true : state === 'some' ? 'mixed' : false}
      aria-label={label}
      className={`${styles.check} ${state === 'none' ? '' : styles.checkOn}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      {state === 'all' ? '✓' : state === 'some' ? '–' : ''}
    </button>
  );
}

export function DotsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

export { styles as cellStyles };
