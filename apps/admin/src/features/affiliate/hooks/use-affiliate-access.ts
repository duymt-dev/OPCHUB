'use client';

import type { AdminPermissionKey } from '@opchub/shared';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { can } from '@/lib/permission-model';
import { useGrants } from '@/lib/permissions';

export function useAffiliateAccess() {
  const grants = useGrants();
  const toast = useToast();
  const t = useTranslations('common.rbac');
  const allowed = (key: AdminPermissionKey) =>
    (!grants.previewing || key.endsWith('.view')) && can(grants, key);
  const guard = (key: 'affiliate.action' | 'affiliate.payout') => {
    if (allowed(key)) return true;
    toast(t('viewOnlyToast', { role: grants.roleName }));
    return false;
  };
  return {
    view: allowed('affiliate.view'),
    write: allowed('affiliate.action'),
    payout: allowed('affiliate.payout'),
    guard,
  };
}
