import { StoreDetailScreen } from '@/features/stores';

/** P-107 / P-108: Chi tiết gian hàng có URL riêng */
export const dynamic = 'force-dynamic';

export default async function StoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StoreDetailScreen id={decodeURIComponent(id)} />;
}
