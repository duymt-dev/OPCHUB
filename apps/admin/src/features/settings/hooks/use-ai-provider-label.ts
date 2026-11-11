'use client';

import { AI_PROVIDER_CATALOG, type AiProviderId } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';

/** Stable IDs decide the label; never reverse-match arbitrary provider/model/error text. */
export function useAiProviderLabel() {
  const t = useTranslations('settings.ai');
  return (id: AiProviderId) =>
    id === 'custom' ? t('customProviderLabel') : AI_PROVIDER_CATALOG[id].name;
}
