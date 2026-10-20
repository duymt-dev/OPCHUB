import { ReferralRedirect } from '@/features/auth';

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ReferralRedirect rawCode={code} />;
}
