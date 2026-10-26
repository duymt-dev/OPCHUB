'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import styles from './stores.module.css';

/** Tab "Khám phá gian hàng" / "Gian hàng của tôi" (prototype `st.tabs`) */
export function StoreTabs({ active }: { active: 'explore' | 'mine' }) {
  const t = useTranslations('stores.tabs');
  const router = useRouter();
  const tabs = [
    { key: 'explore' as const, href: '/stores' },
    { key: 'mine' as const, href: '/stores/mine' },
  ];
  return (
    <div className={styles.tabs} role="tablist">
      {tabs.map((x) => (
        <button
          key={x.key}
          type="button"
          role="tab"
          aria-selected={active === x.key}
          className={`${styles.tab} ${active === x.key ? styles.tabOn : ''}`}
          onClick={() => active !== x.key && router.push(x.href)}
        >
          {t(x.key)}
        </button>
      ))}
    </div>
  );
}
