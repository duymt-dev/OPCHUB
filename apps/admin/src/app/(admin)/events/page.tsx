import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { EventsScreen } from '@/features/events';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return { title: `${t('events')} · OPC Hub Admin` };
}

/** D-42 → D-50. Lọc/trang nằm trên URL (useSearchParams) nên render động, không bọc Suspense */
export const dynamic = 'force-dynamic';

export default function EventsPage() {
  return <EventsScreen />;
}
