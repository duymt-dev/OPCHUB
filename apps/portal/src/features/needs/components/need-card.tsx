'use client';

import type { Need } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { budgetText, dueText, locationOf, storeInitials } from '../model';
import { ContactButtons, TypeChip } from './need-bits';
import styles from './list.module.css';

interface Props {
  n: Need;
  onStore: (id: string) => void;
  onMatch: (n: Need) => void;
}

const BOX = 'M21 8l-9-5-9 5 9 5zM3 8v8l9 5 9-5V8';
const PIN =
  'M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z';
const STAR = 'M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8-5-3.6-5 3.6 1.9-5.8L4 8.8h6.1z';
const SHIELD = 'M12 2l8 4v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6zM9 12l2 2 4-4';

function Line({ d, sw = '1.8' }: { d: string; sw?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

function Wallet() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

/** "Gợi ý: k gian hàng X cùng tỉnh / toàn quốc" — null khi không có gian hàng phù hợp */
export function useMatchText() {
  const t = useTranslations('needs');
  return (n: Need) =>
    n.suggestion && n.suggestion.count > 0
      ? t('suggest', {
          n: n.suggestion.count,
          field: n.field,
          where: t(n.suggestion.sameProvince ? 'sameProvince' : 'nation'),
        })
      : null;
}

/** Thẻ lưới (prototype `nd.isGrid`) */
export function NeedCard({ n, onStore, onMatch }: Props) {
  const t = useTranslations('needs');
  const match = useMatchText()(n);
  const budget = budgetText(n);
  return (
    <article className={styles.gCard} data-need={n.id}>
      <div className={styles.gTop}>
        <TypeChip type={n.type} />
        <span />
        <span className={styles.rDue}>{dueText(n, { due: t('due'), none: t('noDue') })}</span>
      </div>
      <span className={styles.gTitle}>{n.title}</span>
      <span className={styles.gDesc}>{n.description}</span>
      <div className={styles.gMeta}>
        <span>
          <Line d={BOX} />
          {/* Prototype chèn giá trị bằng <span> trong khung flex → mỗi đoạn là 1 ô flex riêng */}
          {t.rich('scaleField', {
            qty: n.quantity || '—',
            field: n.field,
            v: (c) => <span>{c}</span>,
          })}
        </span>
        {budget ? (
          <span>
            <Wallet />
            {t('budget', { v: budget })}
          </span>
        ) : null}
        {n.standards.length ? (
          <span>
            <Line d={SHIELD} />
            {n.standards.join(' · ')}
          </span>
        ) : null}
        <span>
          <Line d={PIN} />
          {locationOf(n)}
        </span>
      </div>
      {match ? (
        <button type="button" className={styles.match} onClick={() => onMatch(n)}>
          <Line d={STAR} sw="2" />
          <span>{match}</span>
          <span>→</span>
        </button>
      ) : null}
      <div className={styles.gFoot}>
        <button type="button" className={styles.store} onClick={() => onStore(n.store.id)}>
          <span
            className={styles.avatar}
            style={n.store.coverUrl ? { backgroundImage: `url('${n.store.coverUrl}')` } : undefined}
          >
            {n.store.coverUrl ? null : storeInitials(n.store.name)}
          </span>
          <span className={styles.storeName}>{n.store.name}</span>
        </button>
        <ContactButtons n={n} />
      </div>
    </article>
  );
}

/** Dòng danh sách (prototype `nd.isRows`) */
export function NeedRow({ n, onStore, onMatch }: Props) {
  const t = useTranslations('needs');
  const match = useMatchText()(n);
  return (
    <div className={styles.row} data-need={n.id}>
      <span>
        <TypeChip type={n.type} />
      </span>
      <div className={styles.rCol}>
        <span className={styles.rTitle}>{n.title}</span>
        {match ? (
          <button type="button" className={styles.rMatch} onClick={() => onMatch(n)}>
            ★ {match} →
          </button>
        ) : null}
      </div>
      <div className={`${styles.rCol} ${styles.rSmall}`}>
        <span>{n.quantity || '—'}</span>
        <span className={styles.rDue}>{n.field}</span>
      </div>
      <button
        type="button"
        className={`${styles.rCol} ${styles.store}`}
        onClick={() => onStore(n.store.id)}
      >
        <span className={`${styles.rEllipsis} ${styles.rSmall}`}>{n.store.name}</span>
        <span className={`${styles.rEllipsis} ${styles.rDue}`}>{locationOf(n)}</span>
      </button>
      <span className={styles.rDue}>{dueText(n, { due: t('due'), none: t('noDue') })}</span>
      <ContactButtons n={n} small />
    </div>
  );
}
