'use client';

import { useToast } from '@opchub/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { fetchLlmConfig, llmKey, saveLlmConfig, verifyLlmConfig } from '../llm-api';
import { useSettingsMutation } from './use-settings-mutation';

export function useLlmConfig() {
  const t = useTranslations('settings.llm');
  const toast = useToast();
  const query = useQuery({ queryKey: llmKey, queryFn: fetchLlmConfig });
  const save = useSettingsMutation({
    key: llmKey,
    fn: saveLlmConfig,
    write: true,
    onDone: () => toast(t('saved')),
  });
  const verify = useSettingsMutation({ key: llmKey, fn: verifyLlmConfig });
  return { query, save, verify };
}
