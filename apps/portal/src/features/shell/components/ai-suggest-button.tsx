'use client';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { AiSuggestButton, useToast } from '@opchub/ui';
import {
  aiComposeConfigSchema,
  aiComposeResponseSchema,
  type AiCompose,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';

export function PortalAiSuggestButton({
  kind,
  input,
  apply,
}: {
  kind: 'store_description' | 'project_summary';
  input: AiCompose['input'];
  apply: (text: string) => void;
}) {
  const locale = useLocale();
  const t = useTranslations('common.aiSuggest');
  const toast = useToast();
  const config = useQuery({
    queryKey: ['ai-compose-config'],
    queryFn: () => api('/ai/config', { schema: aiComposeConfigSchema }),
  });
  if (!config.data?.compose) return null;
  return (
    <AiSuggestButton
      request={async () =>
        (
          await api('/ai/compose', {
            method: 'POST',
            body: { kind, input, locale },
            schema: aiComposeResponseSchema,
          })
        ).text
      }
      apply={apply}
      onError={() => toast(t('failed'))}
      labels={{
        suggest: t('suggest'),
        use: t('use'),
        dismiss: t('dismiss'),
        preview: t('preview'),
      }}
    />
  );
}
