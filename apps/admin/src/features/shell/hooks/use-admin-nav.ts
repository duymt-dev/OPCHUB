'use client';

import { usePathname } from 'next/navigation';
import { useGrants } from '@/lib/permissions';
import { navModel } from '../nav-model';

/** Nav theo quyền đang áp (vai trò hoặc xem thử) + mục đang mở */
export function useAdminNav() {
  const g = useGrants();
  const pathname = usePathname();
  return { ...navModel(g, pathname), grants: g };
}
