'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@opchub/ui';
import type { BankSettings } from '@opchub/shared/api-domains';
import { bankKeys, rotateBankKey } from '../bank-api';
import { useSettingsMutation } from './use-settings-mutation';

export function useBankKey(provider: BankSettings['provider']) {
  const t = useTranslations('settings.bank'),
    toast = useToast();
  const [newKey, setNewKey] = useState<string | null>(null);
  const rotate = useSettingsMutation({
    key: bankKeys.config,
    fn: async () => {
      const r = await rotateBankKey();
      setNewKey(r.key);
      // Only the hint, never plaintext, enters TanStack's mutation cache.
      return r.hint;
    },
    onDone: () => toast(t('rotated', { provider: t(`providers.${provider}`) })),
  });
  return { rotate, newKey, clearKey: () => setNewKey(null) };
}
