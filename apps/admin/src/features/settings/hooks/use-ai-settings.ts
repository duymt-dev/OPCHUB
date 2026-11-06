'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import {
  aiSettingsUpdateSchema,
  aiSettingsSchema,
  type AiProviderId,
  type AiProviderUpdate,
  type AiSettingsResponse,
  type AiSettingsUpdate,
} from '@opchub/shared/api-domains';
import { aiKey, fetchAiSettings, saveAiSettings, verifyAiProvider } from '../ai-api';
import { useSettingsMutation } from './use-settings-mutation';

function editable(saved: AiSettingsResponse): AiSettingsUpdate {
  const providers = saved.providers;
  const settings = aiSettingsSchema.parse(
    Object.fromEntries(
      Object.entries(saved).filter(([key]) => key !== 'spend' && key !== 'providers'),
    ),
  );
  const enabled = new Set(providers.filter((p) => p.enabled).map((p) => p.id));
  settings.use = { ...settings.use };
  for (const purpose of Object.keys(settings.use) as (keyof typeof settings.use)[])
    if (!enabled.has(settings.use[purpose] as AiProviderId)) settings.use[purpose] = '';
  if (!enabled.has(settings.fallback as AiProviderId)) settings.fallback = '';
  return {
    ...settings,
    providers: providers.map((p) => ({
      id: p.id,
      enabled: p.enabled,
      baseUrl: p.baseUrl,
      model: p.model,
      priceIn: p.priceIn,
      priceOut: p.priceOut,
      key: '',
    })),
  };
}
export function useAiSettings() {
  const t = useTranslations('settings.ai');
  const toast = useToast();
  const query = useQuery({ queryKey: aiKey, queryFn: fetchAiSettings });
  const [draft, setDraft] = useState<AiSettingsUpdate | null>(null);
  const [selected, select] = useState<AiProviderId>('claude');
  const [warnings, setWarnings] = useState<string[]>([]);
  const form = draft ?? (query.data ? editable(query.data) : null);
  const save = useSettingsMutation({
    key: aiKey,
    fn: saveAiSettings,
    write: true,
    onDone: () => {
      setDraft(null);
      setWarnings([]);
      toast(t('saved'));
    },
  });
  const verify = useSettingsMutation({
    key: aiKey,
    fn: verifyAiProvider,
    onDone: (r) => toast(r.message),
  });
  const set = (patch: Partial<AiSettingsUpdate>) => {
    if (form) setDraft({ ...form, ...patch });
  };
  const provider = (id: AiProviderId, patch: Partial<AiProviderUpdate>) => {
    if (!form) return;
    const use = { ...form.use };
    if (patch.enabled === false)
      setWarnings([
        ...Object.entries(use)
          .filter(([, v]) => v === id)
          .map(([key]) => key),
        ...(form.fallback === id ? ['fallback'] : []),
      ]);
    if (patch.enabled === false)
      for (const purpose of Object.keys(use) as (keyof typeof use)[])
        if (use[purpose] === id) use[purpose] = '';
    setDraft({
      ...form,
      providers: form.providers.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      use,
      fallback: patch.enabled === false && form.fallback === id ? '' : form.fallback,
    });
    verify.reset();
  };
  const submit = () => {
    const parsed = aiSettingsUpdateSchema.safeParse(form);
    if (!parsed.success) {
      toast(t('invalid'));
      return;
    }
    save.mutate(parsed.data);
  };
  const status = (id: AiProviderId): 'ok' | 'err' | 'none' =>
    verify.variables?.id === id && verify.data
      ? verify.data.ok
        ? 'ok'
        : 'err'
      : form?.providers.find((p) => p.id === id)?.key
        ? 'none'
        : (query.data?.providers.find((p) => p.id === id)?.status ?? 'none');
  return {
    query,
    warnings,
    form,
    selected,
    select,
    set,
    provider,
    submit,
    save,
    verify,
    status,
    busy: save.isPending || verify.isPending,
  };
}
