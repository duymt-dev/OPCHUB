'use client';

import { STORE_FIELDS, storeFieldIcon } from '@opchub/shared/fixtures';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { CATEGORY_COLLAPSED, HERO_IMAGE, STORE_SUGGESTIONS } from '../model';
import styles from './explore.module.css';

/** Ô tìm kiếm — `key={q}` ở nơi dùng: đổi `q` từ ngoài (gợi ý, Đặt lại) thì nạp lại chữ */
function SearchBox({ q, onSearch }: { q: string; onSearch: (q: string) => void }) {
  const t = useTranslations('stores.hero');
  const [text, setText] = useState(q);
  return (
    <form
      className={styles.search}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(text);
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="7" stroke="rgba(0,0,0,0.55)" strokeWidth="2" />
        <path d="M20 20l-3.5-3.5" stroke="rgba(0,0,0,0.55)" strokeWidth="2" />
      </svg>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('placeholder')}
        aria-label={t('placeholder')}
      />
      <button type="submit">{t('search')}</button>
    </form>
  );
}

/** Ảnh nền + ô tìm kiếm + gợi ý (prototype hero Khám phá) */
export function ExploreHero({ q, onSearch }: { q: string; onSearch: (q: string) => void }) {
  const t = useTranslations('stores.hero');
  return (
    <div className={styles.hero} style={{ backgroundImage: `url('${HERO_IMAGE}')` }}>
      <div className={styles.heroShade} />
      <div className={styles.heroBody}>
        <span className={styles.heroTitle}>{t('title')}</span>
        <span className={styles.heroSub}>{t('sub')}</span>
        <SearchBox key={q} q={q} onSearch={onSearch} />
        <div className={styles.sugs}>
          <span className={styles.sugLabel}>{t('suggest')}</span>
          {STORE_SUGGESTIONS.map((s) => (
            <button key={s} type="button" className={styles.sug} onClick={() => onSearch(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface CatProps {
  selected: string[];
  onPick: (field: string | null) => void;
}

/** Ô danh mục ngành (prototype `st.cats`): "Tất cả" + 14 ngành, thu gọn còn 15 ô */
export function CategoryTiles({ selected, onPick }: CatProps) {
  const t = useTranslations('stores.cats');
  const [more, setMore] = useState(false);
  const all = [null, ...STORE_FIELDS];
  const shown = more ? all : all.slice(0, CATEGORY_COLLAPSED);
  const isOn = (f: string | null) =>
    f === null ? selected.length === 0 : selected.length === 1 && selected[0] === f;
  return (
    <div className={styles.cats}>
      {shown.map((f) => {
        const label = f ?? t('all');
        return (
          <button
            key={label}
            type="button"
            title={label}
            className={`${styles.cat} ${isOn(f) ? styles.catOn : ''}`}
            aria-pressed={isOn(f)}
            onClick={() => onPick(f)}
          >
            <span className={styles.catIc}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d={storeFieldIcon(f ?? 'Tất cả')}
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className={styles.catL}>{label}</span>
          </button>
        );
      })}
      <button type="button" className={styles.catMore} onClick={() => setMore((v) => !v)}>
        <span className={styles.catMoreIc}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.2" />
            <circle cx="12" cy="12" r="1.2" />
            <circle cx="19" cy="12" r="1.2" />
          </svg>
        </span>
        {more ? t('less') : t('more')}
      </button>
    </div>
  );
}
