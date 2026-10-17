import type { Metadata } from 'next';
import { SettingsScreen } from '@/features/settings';

export const metadata: Metadata = { title: 'Cài đặt & Phân quyền · OPC Hub Admin' };
export const dynamic = 'force-dynamic';

/** /settings?tab=general|categories|roles|welcome-mail|smtp|admins|audit-log|sso|languages */
export default function SettingsPage() {
  return <SettingsScreen />;
}
