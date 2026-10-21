import { pageMeta } from '@/i18n/page-meta';
import { CommunityScreen } from '@/features/community';

export const generateMetadata = pageMeta('community');

/**
 * P-17 → P-27. Bộ lọc/trang nằm trên URL (useSearchParams) nên render động,
 * không bọc Suspense (tránh nhịp hiện nội dung 300 ms của React).
 */
export const dynamic = 'force-dynamic';

export default function CommunityPage() {
  return <CommunityScreen />;
}
