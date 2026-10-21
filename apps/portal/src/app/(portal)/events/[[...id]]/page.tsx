import { pageMeta } from '@/i18n/page-meta';
import { EventsScreen } from '@/features/events';

export const generateMetadata = pageMeta('events');

/**
 * P-49 → P-54. `/events` và `/events/:id` (chi tiết có URL — D-39) dùng chung một màn;
 * lọc/tìm trên query nên render động, không bọc Suspense.
 */
export const dynamic = 'force-dynamic';

export default function EventsPage() {
  return <EventsScreen />;
}
