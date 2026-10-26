import { pageMeta } from '@/i18n/page-meta';
import type { ReactNode } from 'react';

export const generateMetadata = pageMeta('stores');

/** Không bọc Suspense: fallback đứng yên khi harness parity dừng đồng hồ */
export const dynamic = 'force-dynamic';

/** V4-608 Gian hàng địa phương: `/stores`, `/stores/mine`, `/stores/[id]` */
export default function StoresLayout({ children }: { children: ReactNode }) {
  return children;
}
