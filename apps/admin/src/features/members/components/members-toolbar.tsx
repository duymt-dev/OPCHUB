'use client';

import type { AdminMemberPage } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { MEMBER_TYPE_FILTERS, type MemberTypeFilter, type MemberView } from '../types';
import styles from './members-toolbar.module.css';

const VIEW_ICON: Record<MemberView, string> = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
};
const VIEW_ORDER: MemberView[] = ['grid', 'list'];

interface Props {
  counts: AdminMemberPage['counts'] | undefined;
  view: MemberView;
  type: MemberTypeFilter;
  q: string;
  onView: (v: MemberView) => void;
  onType: (t: MemberTypeFilter) => void;
  onSearch: (q: string) => void;
}

/** Tiêu đề "Thành viên · N tài khoản", ô tìm, đổi lưới / danh sách, chip loại tài khoản */
export function MembersToolbar(p: Props) {
  const t = useTranslations('members.card');
  // Ô nhập giữ chữ đang gõ; URL chỉ nhận giá trị đã trim
  const [draft, setDraft] = useState(p.q);
  const label: Record<MemberTypeFilter, string> = {
    all: t('typeAll'),
    business: t('typeBiz'),
    personal: t('typePer'),
  };
  return (
    <>
      <div className={styles.head}>
        <div className={styles.title}>
          {t('title')} <span className={styles.count}>{t('count', { n: p.counts?.all ?? 0 })}</span>
        </div>
        <input
          className={styles.search}
          value={draft}
          placeholder={t('search')}
          aria-label={t('search')}
          onChange={(e) => {
            setDraft(e.target.value);
            p.onSearch(e.target.value.trim());
          }}
        />
        <div className={styles.views}>
          {VIEW_ORDER.map((v) => (
            <button
              key={v}
              type="button"
              title={t(v)}
              aria-label={t(v)}
              aria-pressed={p.view === v}
              className={`${styles.view} ${p.view === v ? styles.on : ''}`}
              onClick={() => p.onView(v)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d={VIEW_ICON[v]} />
              </svg>
            </button>
          ))}
        </div>
      </div>
      <div className={styles.types} role="radiogroup" aria-label={t('types')}>
        {MEMBER_TYPE_FILTERS.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={p.type === k}
            className={`${styles.type} ${p.type === k ? styles.on : ''}`}
            onClick={() => p.onType(k)}
          >
            {label[k]}
            <span className={styles.n}>{p.counts?.[k] ?? 0}</span>
          </button>
        ))}
      </div>
    </>
  );
}
