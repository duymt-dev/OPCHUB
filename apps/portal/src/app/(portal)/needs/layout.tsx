import { pageMeta } from '@/i18n/page-meta';
import type { ReactNode } from 'react';

export const generateMetadata = pageMeta('needs');

/** Không bọc Suspense: fallback đứng yên khi harness parity dừng đồng hồ */
export const dynamic = 'force-dynamic';

/** V4-609 Nhu cầu địa phương: `/needs`, `/needs/mine` */
export default function NeedsLayout({ children }: { children: ReactNode }) {
  return children;
}
