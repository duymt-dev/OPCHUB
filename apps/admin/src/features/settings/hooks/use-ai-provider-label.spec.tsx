import { cleanup, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, expect, it } from 'vitest';
import { AI_PROVIDER_CATALOG, AI_PROVIDER_IDS } from '@opchub/shared/api-domains';
import source from '../../../../messages/vi/settings/ai.json';
import english from '../../../../messages/en/settings/ai.json';
import { useAiProviderLabel } from './use-ai-provider-label';

afterEach(cleanup);
it('D-141 AC824-06/11 projects the custom label only and retains all canonical catalog data', () => {
  const snapshot = JSON.stringify(AI_PROVIDER_CATALOG);
  const current = { locale: 'vi' };
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider
        locale={current.locale}
        timeZone="Asia/Ho_Chi_Minh"
        messages={{ settings: current.locale === 'vi' ? source : english }}
      >
        {children}
      </NextIntlClientProvider>
    );
  }
  const h = renderHook(useAiProviderLabel, { wrapper: Wrapper });
  expect(h.result.current('custom')).toBe(AI_PROVIDER_CATALOG.custom.name);
  current.locale = 'en';
  h.rerender();
  expect(h.result.current('custom')).toBe('Custom (OpenAI-compatible)');
  for (const id of AI_PROVIDER_IDS.filter((id) => id !== 'custom')) {
    expect(h.result.current(id)).toBe(AI_PROVIDER_CATALOG[id].name);
  }
  expect(JSON.stringify(AI_PROVIDER_CATALOG)).toBe(snapshot);
});
