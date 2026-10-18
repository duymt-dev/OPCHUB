import type { Metadata } from 'next';
import { GuideScreen } from '@/features/auth';

export const metadata: Metadata = { title: 'Hướng dẫn sử dụng · OPC Hub' };

/** BUG-023: link "Hướng dẫn sử dụng" trong mail chào mừng — trang tĩnh public (V2Q-59) */
export default function Page() {
  return <GuideScreen />;
}
