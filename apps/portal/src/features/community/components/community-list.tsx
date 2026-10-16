'use client';

import { Pagination } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { pageSlice } from '../model';
import { PAGE_SIZES, type CommunityGroup } from '../types';
import { CommunityCard, type CardHandlers } from './community-card';
import styles from './community.module.css';

interface Props {
  list: CommunityGroup[];
  page: number;
  size: number;
  handlers: CardHandlers;
  onPage: (page: number) => void;
  onSize: (size: number) => void;
  onReset: () => void;
}

/** Lưới thẻ + phân trang "N / trang", hoặc trạng thái rỗng "Xoá bộ lọc" */
export function CommunityList({ list, page, size, handlers, onPage, onSize, onReset }: Props) {
  const t = useTranslations('community');
  if (list.length === 0)
    return (
      <div className={styles.empty}>
        <div className={styles.emptyTitle}>{t('empty.title')}</div>
        <div className={styles.emptyDesc}>{t('empty.desc')}</div>
        <button type="button" className={styles.reset} onClick={onReset}>
          {t('empty.reset')}
        </button>
      </div>
    );

  const slice = pageSlice(list, page, size);
  return (
    <>
      <div className={styles.grid}>
        {slice.items.map((g) => (
          <CommunityCard key={g.id} g={g} handlers={handlers} />
        ))}
      </div>
      <Pagination
        page={slice.page}
        size={size}
        total={list.length}
        sizeOptions={[...PAGE_SIZES]}
        onChange={onPage}
        onSizeChange={onSize}
        labels={{
          unit: t('pager.unit'),
          prev: t('pager.prev'),
          next: t('pager.next'),
          pageSize: t('pager.pageSize'),
        }}
      />
    </>
  );
}
