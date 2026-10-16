import type { Metadata } from 'next';
import { OverviewScreen } from '@/features/overview';

export const metadata: Metadata = { title: 'Tổng quan · OPC Hub Admin' };

export default function OverviewPage() {
  return <OverviewScreen />;
}
