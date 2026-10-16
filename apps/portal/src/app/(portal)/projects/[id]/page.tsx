import { DetailScreen } from '@/features/projects';

/** P-62 → P-72: Chi tiết dự án có URL riêng (D-39) */
export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DetailScreen id={decodeURIComponent(id)} />;
}
