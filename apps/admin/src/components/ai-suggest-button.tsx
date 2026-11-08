'use client';
import { useQuery } from '@tanstack/react-query';
import { AiSuggestButton, useToast } from '@opchub/ui';
import {
  aiComposeConfigSchema,
  aiComposeResponseSchema,
  type AiCompose,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';

export function AdminAiSuggestButton({
  input,
  apply,
}: {
  input: AiCompose['input'];
  apply: (text: string) => void;
}) {
  const toast = useToast();
  const config = useQuery({
    queryKey: ['admin-ai-compose-config'],
    queryFn: () => api('/admin/ai/config', { schema: aiComposeConfigSchema }),
  });
  if (!config.data?.compose) return null;
  return (
    <AiSuggestButton
      request={async () =>
        (
          await api('/admin/ai/compose', {
            method: 'POST',
            body: { kind: 'campaign_body', input, locale: 'vi' },
            schema: aiComposeResponseSchema,
          })
        ).text
      }
      apply={apply}
      onError={() => toast('Chưa gợi ý được, vui lòng thử lại sau')}
      labels={{
        suggest: 'Gợi ý bằng AI',
        use: 'Dùng gợi ý',
        dismiss: 'Bỏ qua',
        preview: 'Gợi ý nội dung',
      }}
    />
  );
}
