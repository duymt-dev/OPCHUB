'use client';

import type { SearchHit, SearchKind } from '@opchub/shared/api-domains';
import { GlobalSearch } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useGrants } from '@/lib/permissions';
import { useGlobalSearch } from '../hooks/use-global-search';
import { useNumberText } from '@/i18n/use-number-text';

export function adminSearchPath(kind: SearchKind, item: SearchHit): string {
  if (kind === 'project') return `/projects/${encodeURIComponent(item.id)}/review`;
  const paths = { store: 'stores', need: 'needs', group: 'groups', member: 'members' };
  return `/${paths[kind]}?q=${encodeURIComponent(item.title)}`;
}

export function AdminSearch() {
  const numberText = useNumberText();
  const t = useTranslations('common.shell.globalSearch');
  const router = useRouter();
  const search = useGlobalSearch();
  const grants = useGrants();
  const permissions = {
    store: 'stores.view',
    need: 'stores.view',
    project: 'projects.view',
    group: 'groups.view',
    member: 'members.view',
  };
  return (
    <GlobalSearch
      placeholder={t('placeholder')}
      emptyText={t('empty')}
      clearLabel={t('clear')}
      hintText={t('hint')}
      loading={search.loading}
      loadingText={t('loading')}
      {...(search.failed ? { errorText: t('failed') } : {})}
      emptyQueryText={(query) => t('emptyQuery', { query })}
      open={search.open}
      onQuery={search.onQuery}
      groups={search.groups
        .filter((group) => grants.keys.includes(permissions[group.kind]))
        .map((group) => ({
          ...group,
          label: t(`groups.${group.kind}`),
          items: group.items.map((item) =>
            group.kind === 'group'
              ? { ...item, sub: t('members', { n: numberText(item.memberCount ?? 0) }) }
              : item,
          ),
        }))}
      onPick={(kind, item) => router.push(adminSearchPath(kind, item))}
    />
  );
}
