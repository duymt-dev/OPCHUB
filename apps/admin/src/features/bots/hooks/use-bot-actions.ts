'use client';

import type { BotSettings, Persona } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api-client';
import {
  approveThread,
  botKeys,
  deletePersona,
  deleteScript,
  patchSettings,
  rejectThread,
  runScript,
  savePersona,
} from '../api';
import { personaBody, personaToForm } from '../model';

/** Thao tác ghi của màn Bot (mọi thao tác đi qua API — MSW ghi audit, luật 10) */
export function useBotActions() {
  const t = useTranslations('bots');
  const qc = useQueryClient();
  const toast = useToast();
  const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : t('disabled'));
  const inv = (...keys: (readonly string[])[]) =>
    Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));

  const settings = useMutation({
    mutationFn: patchSettings,
    onMutate: (patch) =>
      qc.setQueryData<BotSettings>(botKeys.settings(), (old) => (old ? { ...old, ...patch } : old)),
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

  const approve = useMutation({
    mutationFn: approveThread,
    onSuccess: async (r) => {
      await inv(botKeys.threads(), botKeys.activity());
      toast(t('thread.approved', { n: r.groupCount }));
    },
    onError: fail,
  });

  const reject = useMutation({
    mutationFn: rejectThread,
    onSuccess: async () => {
      await inv(botKeys.threads());
      toast(t('thread.rejected'));
    },
    onError: fail,
  });

  return {
    patchSettings: (p: Partial<BotSettings>) => settings.mutate(p),
    togglePersona: (p: Persona) => togglePersona.mutate(p),
    removePersona: (id: string) => removePersona.mutate(id),
    removeScript: (id: string) => removeScript.mutate(id),
    run: (id: string) => run.mutate(id),
    approve: (id: string) => approve.mutate(id),
    reject: (id: string) => reject.mutate(id),
    busy: run.isPending || approve.isPending || reject.isPending,
  };
}
