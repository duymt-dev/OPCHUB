'use client';

import type { BotSettings, Persona } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api-client';
import { useCan } from '@/lib/permissions';
import {
  stopThread,
  botKeys,
  deletePersona,
  deleteScript,
  patchSettings,
  runScript,
  savePersona,
} from '../api';
import { botReplyKey } from '../reply-api';
import { personaBody, personaToForm } from '../model';

/** Thao tác ghi của màn Bot (mọi thao tác đi qua API — MSW ghi audit, luật 10) */
export function useBotActions() {
  const t = useTranslations('bots');
  const canAct = useCan('bots.action');
  const qc = useQueryClient();
  const toast = useToast();
  const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : t('disabled'));
  const inv = (...keys: (readonly string[])[]) =>
    Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));

  const settings = useMutation({
    scope: { id: 'bot-control' },
    mutationFn: (patch: Partial<BotSettings>) =>
      canAct ? patchSettings(patch) : Promise.resolve(null),
    onSuccess: (result) => {
      if (result) qc.setQueryData(botKeys.settings(), result);
      void inv(botReplyKey);
    },
    onError: (e) => {
      fail(e);
      void inv(botKeys.settings());
    },
  });

  const togglePersona = useMutation({
    mutationFn: (p: Persona) =>
      savePersona(p.id, { ...personaBody(personaToForm(p)), enabled: !p.enabled }),
    onSuccess: () => inv(botKeys.personas()),
    onError: fail,
  });

  const removePersona = useMutation({
    mutationFn: deletePersona,
    onSuccess: async () => {
      await inv(botKeys.personas(), botKeys.threads());
      toast(t('persona.deleted'));
    },
    onError: fail,
  });

  const removeScript = useMutation({
    mutationFn: deleteScript,
    onSuccess: async () => {
      await inv(botKeys.scripts(), botKeys.threads());
      toast(t('script.deleted'));
    },
    onError: fail,
  });

  const run = useMutation({
    mutationFn: runScript,
    onSuccess: async () => {
      await inv(botKeys.threads());
      toast(t('script.ran'));
    },
    onError: fail,
  });

  const stop = useMutation({
    mutationFn: stopThread,
    onSuccess: async () => {
      await inv(botKeys.threads(), botKeys.activity());
      toast(t('thread.stopped'));
    },
    onError: fail,
  });

  return {
    patchSettings: (p: Partial<BotSettings>) => settings.mutate(p),
    togglePersona: (p: Persona) => togglePersona.mutate(p),
    removePersona: (id: string) => removePersona.mutate(id),
    removeScript: (id: string) => removeScript.mutate(id),
    run: (id: string) => run.mutate(id),
    stop: (id: string) => stop.mutate(id),
    busy: run.isPending || stop.isPending,
    settingsBusy: settings.isPending,
  };
}
