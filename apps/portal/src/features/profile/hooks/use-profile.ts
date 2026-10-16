'use client';

import type { Profile, UpdateProfileRequest } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { fetchProfile, patchProfile, profileKeys } from '../api';

export function useProfile() {
  return useQuery({ queryKey: profileKeys.me(), queryFn: fetchProfile });
}

/** Toast lỗi: thông điệp server nếu có, ngược lại câu chung */
export function useErrorToast() {
  const toast = useToast();
  const t = useTranslations('profile.toast');
  return (e: unknown) => toast(e instanceof ApiError ? e.message : t('failed'));
}

/** PATCH /me → ghi cache hồ sơ + đồng bộ tên/ảnh lên khung app (auth-store `me`) */
export function useUpdateProfile() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (body: UpdateProfileRequest) => patchProfile(body),
    onSuccess: (p: Profile) => {
      qc.setQueryData(profileKeys.me(), p);
      const { accessToken, me, setSession } = useAuthStore.getState();
      if (accessToken && me)
        setSession(accessToken, {
          ...me,
          fullName: p.fullName,
          email: p.email,
          avatarUrl: p.avatarUrl,
        });
    },
    onError,
  });
}
