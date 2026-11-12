import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { AdminProfileScreen } from '@/features/profile';
export default function ProfilePage() {
  return <AdminProfileScreen />;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return { title: `${t('profile')} · OPC Hub Admin` };
}
