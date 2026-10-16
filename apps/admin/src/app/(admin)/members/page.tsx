import type { Metadata } from 'next';
import { MembersScreen } from '@/features/members';

export const metadata: Metadata = { title: 'Thành viên · OPC Hub Admin' };
/** Lọc / trang đọc từ URL ở client — không bọc Suspense (fallback đứng yên khi parity dừng giờ) */
export const dynamic = 'force-dynamic';

export default function MembersPage() {
  return <MembersScreen />;
}
