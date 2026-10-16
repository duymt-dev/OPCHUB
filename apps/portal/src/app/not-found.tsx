import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('common.state');
  return <main style={{ padding: 48, textAlign: 'center' }}>{t('notFound')}</main>;
}
