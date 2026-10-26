import { NeedsScreen } from '@/features/needs';

/** P-111 / P-112: Tất cả nhu cầu — lọc / trang trên URL */
export const dynamic = 'force-dynamic';

export default function NeedsPage() {
  return <NeedsScreen tab="all" />;
}
