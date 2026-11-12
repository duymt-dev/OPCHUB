import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { MembersScreen } from '@/features/members';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return { title: `${t('members')} · OPC Hub Admin` };
}
/** Lọc / trang đọc từ URL ở client — không bọc Suspense (fallback đứng yên khi parity dừng giờ) */
export const dynamic = 'force-dynamic';

export default function MembersPage() {
  return <MembersScreen />;
}
