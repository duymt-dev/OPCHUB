import type { Metadata } from 'next';
import { ProfileScreen } from '@/features/profile';

export const metadata: Metadata = { title: 'Hồ sơ cá nhân · OPC Hub' };

/**
 * P-89 → P-95. Tab nằm trên URL (`?tab=`) nên render động,
 * không bọc Suspense (fallback đứng yên khi đồng hồ parity dừng).
 */
export const dynamic = 'force-dynamic';

export default function ProfilePage() {
  return <ProfileScreen />;
}
