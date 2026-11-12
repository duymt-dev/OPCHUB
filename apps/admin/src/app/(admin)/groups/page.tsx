import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { GroupsScreen } from '@/features/groups';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return { title: `${t('groups')} · OPC Hub Admin` };
}

/** D-23 → D-35. Tab/lọc/trang nằm trên URL (useSearchParams) nên render động, không bọc Suspense */
export const dynamic = 'force-dynamic';

export default function GroupsPage() {
  return <GroupsScreen />;
}
