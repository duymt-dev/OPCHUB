'use client';

import { useTranslations } from 'next-intl';
import type { AdminMenuKey, AdminPermissionKey } from '@opchub/shared';
import type { RegionalRegion } from '@opchub/shared/api-domains';

/** Labels are projections only: keys and canonical payload values remain in their owning domains. */
export function useDomainLabels() {
  const t = useTranslations('ui');
  const region = (key: RegionalRegion, director = false) =>
    t(`regions.${key === 'central' && director ? 'centralDirector' : key}`);
  const canonicalRegion = (value: string) => {
    const known = { 'Miền Bắc': 'north', 'Miền Trung': 'central', 'Miền Nam': 'south' } as const;
    return Object.hasOwn(known, value) ? region(known[value as keyof typeof known]) : value;
  };
  return {
    permission: (key: AdminPermissionKey) => t(`permissions.${key}`),
    menu: (key: AdminMenuKey) => t(`permissionMenus.${key}`),
    region,
    canonicalRegion,
  };
}
