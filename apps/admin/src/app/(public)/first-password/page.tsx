import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { SetupGate, FirstPasswordScreen } from '@/features/auth';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return { title: `${t('firstPassword')} · OPC Hub Admin` };
}

export default function Page() {
  return (
    <SetupGate>
      <FirstPasswordScreen />
    </SetupGate>
  );
}
