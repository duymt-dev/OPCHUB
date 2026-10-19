import type { Metadata } from 'next';
import { FeeTransactionsScreen } from '@/features/fees';

export const metadata: Metadata = { title: 'Giao dịch cần đối soát · OPC Hub Admin' };
export const dynamic = 'force-dynamic';

export default function FeeTransactionsPage() {
  return <FeeTransactionsScreen />;
}
