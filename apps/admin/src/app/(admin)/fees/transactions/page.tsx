import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { FeeTransactionsScreen } from '@/features/fees';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return { title: `${t('transactions')} · OPC Hub Admin` };
}
export const dynamic = 'force-dynamic';

export default function FeeTransactionsPage() {
  return <FeeTransactionsScreen />;
}
