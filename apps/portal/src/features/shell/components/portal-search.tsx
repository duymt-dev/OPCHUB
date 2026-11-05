'use client';

import type { SearchHit, SearchKind } from '@opchub/shared/api-domains';
import { GlobalSearch } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useGlobalSearch } from '../hooks/use-global-search';

export function portalSearchPath(kind: SearchKind, item: SearchHit): string {
  const id = encodeURIComponent(item.id);
  if (kind === 'store') return `/stores/${id}`;
  if (kind === 'need') return `/needs?q=${encodeURIComponent(item.title)}`;
  if (kind === 'project') return `/projects/${id}`;
  return item.joined ? `/chat/${id}` : `/community?join=${id}`;
}

export function PortalSearch() {
  const t = useTranslations('common.shell.globalSearch');
  const router = useRouter();
  const search = useGlobalSearch();
  return (
    <GlobalSearch
      placeholder={t('placeholder')}
      emptyText={t('empty')}
      clearLabel={t('clear')}
      open={search.open}
      onQuery={search.onQuery}
      groups={search.groups.map((group) => ({
        ...group,
        label: t(`groups.${group.kind}`),
        items: group.items.map((item) =>
          group.kind === 'group'
            ? { ...item, sub: t('members', { n: item.memberCount ?? 0 }) }
            : item,
        ),
      }))}
      onPick={(kind, item) => router.push(portalSearchPath(kind, item))}
    />
  );
}
