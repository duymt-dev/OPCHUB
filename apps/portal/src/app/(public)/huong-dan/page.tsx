import { pageMeta } from '@/i18n/page-meta';
import { GuideScreen } from '@/features/auth';

export const generateMetadata = pageMeta('guide');

/** BUG-023: link "Hướng dẫn sử dụng" trong mail chào mừng — trang tĩnh public (V2Q-59) */
export default function Page() {
  return <GuideScreen />;
}
