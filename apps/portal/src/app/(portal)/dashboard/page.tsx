import { EmptyState } from '@opchub/ui';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export const metadata: Metadata = { title: 'Tổng quan · OPC Hub' };

/** Khung trống — nội dung dashboard làm ở làn L1 (P-01) */
export default async function DashboardPage() {
  const t = await getTranslations('common.state');
  return <EmptyState title={t('comingSoon')} />;
}
