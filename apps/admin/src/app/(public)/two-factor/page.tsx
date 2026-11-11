import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { SetupGate, TwoFactorScreen } from '@/features/auth';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return { title: `${t('twoFactor')} · OPC Hub Admin` };
}

export default function Page() {
  return (
    <SetupGate>
      <TwoFactorScreen />
    </SetupGate>
  );
}
