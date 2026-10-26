'use client';

import { NEED_PAGE_SIZE, type Need } from '@opchub/shared/api-domains';
import { ErrorState, PageSkeleton } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LocalizedPagination } from '@/i18n/localized-ui';
import { useNeedList, useNeedParams } from '../hooks/use-needs';
import { suggestionHref } from '../model';
import { NeedCard, NeedRow } from './need-card';
import { NeedFilters, type NeedView } from './need-filters';
import base from './needs.module.css';
import styles from './list.module.css';

/** Tab "Tất cả nhu cầu" (P-111 / P-112): lọc / trang trên URL, dạng lưới / danh sách */
export function NeedsAll() {
  const t = useTranslations('needs');
  const tState = useTranslations('common.state');
  const router = useRouter();
  const p = useNeedParams();
  const list = useNeedList(p.filter);
  const [view, setView] = useState<NeedView>('grid');
  const onStore = (id: string) => router.push(`/stores/${encodeURIComponent(id)}`);
  const onMatch = (n: Need) => router.push(suggestionHref(n));

  if (list.isError)
    return (
      <ErrorState
        title={tState('error')}
        retryLabel={tState('retry')}
        onRetry={() => void list.refetch()}
      />
    );
  if (!list.data) return <PageSkeleton />;
  const { items, total, page, facets } = list.data;
  const Item = view === 'grid' ? NeedCard : NeedRow;
  return (
    <>
      <NeedFilters
        facets={facets}
        type={p.type}
        q={p.filter.q}
        province={p.filter.province ?? ''}
        field={p.filter.field ?? ''}
        view={view}
        onType={(type) => p.set({ type })}
        onQ={(q) => p.set({ q })}
        onProvince={(province) => p.set({ province })}
        onField={(field) => p.set({ field })}
        onView={setView}
      />
      <div className={base.count}>{t('count', { n: total.toLocaleString('vi-VN') })}</div>
      {items.length === 0 ? (
        <div className={`${base.card} ${base.empty}`}>{t('empty')}</div>
      ) : (
        <div className={view === 'grid' ? styles.grid : styles.rows}>
          {view === 'rows' ? (
            <div className={styles.rHead}>
              {(['type', 'need', 'scale', 'poster', 'due', 'contact'] as const).map((k) => (
                <span key={k}>{t(`cols.${k}`)}</span>
              ))}
            </div>
          ) : null}
          {items.map((n) => (
            <Item key={n.id} n={n} onStore={onStore} onMatch={onMatch} />
          ))}
        </div>
      )}
      {total > NEED_PAGE_SIZE ? (
        <LocalizedPagination
          page={page}
          size={NEED_PAGE_SIZE}
          total={total}
          onChange={p.setPage}
          labels={{ unit: t('pager.unit') }}
        />
      ) : null}
    </>
  );
}
