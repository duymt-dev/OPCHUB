import { pageMeta } from '@/i18n/page-meta';
import { DashboardScreen } from '@/features/dashboard';

export const generateMetadata = pageMeta('membershipPay');

/** P-84 → P-86: hộp chuyển khoản do PaywallGate mở theo URL; nền là Dashboard */
export const dynamic = 'force-dynamic';

export default function MembershipPayPage() {
  return <DashboardScreen />;
}
