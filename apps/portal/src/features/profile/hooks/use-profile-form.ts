'use client';

import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { buildPatch, valuesOf } from '../model';
import type { DraftKey, Profile, ProfileDraft } from '../types';
import { useUpdateProfile } from './use-profile';

/** Bản nháp dùng chung cho tab Thông tin cá nhân + Thông tin doanh nghiệp (prototype meEdit) */
export function useProfileForm(profile: Profile) {
  const t = useTranslations('profile.toast');
  const toast = useToast();
  const update = useUpdateProfile();
  const [draft, setDraft] = useState<ProfileDraft>({});

  const save = () => {
    const r = buildPatch(profile, draft);
    if (!r.ok) return toast(r.error);
    if (!r.patch) return toast(t('saved'));
    update.mutate(r.patch, {
      onSuccess: () => {
        setDraft({});
        toast(t('saved'));
      },
    });
  };

  return {
    values: valuesOf(profile, draft),
    set: (k: DraftKey, v: string) => setDraft((d) => ({ ...d, [k]: v })),
    reset: () => setDraft({}),
    save,
    busy: update.isPending,
  };
}
export type ProfileForm = ReturnType<typeof useProfileForm>;
