import type { Metadata } from 'next';
import { ReportsScreen } from '@/features/reports';

export const metadata: Metadata = { title: 'Báo cáo · OPC Hub Admin' };
export const dynamic = 'force-dynamic';

export default function ReportsPage() {
  return <ReportsScreen />;
}
