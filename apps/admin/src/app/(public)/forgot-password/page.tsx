import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ForgotScreen } from '@/features/auth';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return { title: `${t('forgotPassword')} · OPC Hub Admin` };
}

export default function Page() {
  return (
    <Suspense>
      <ForgotScreen />
    </Suspense>
  );
}
