import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { SettingsScreen } from '@/features/settings';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return { title: `${t('settings')} · OPC Hub Admin` };
}
export const dynamic = 'force-dynamic';

/** /settings?tab=general|categories|roles|welcome-mail|smtp|admins|audit-log|sso|languages */
export default function SettingsPage() {
  return <SettingsScreen />;
}
