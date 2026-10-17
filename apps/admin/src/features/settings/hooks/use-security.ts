'use client';

import type { LanguagePatch, SecurityPatch } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useQuery } from '@tanstack/react-query';
import { fetchLanguages, fetchSecurity, patchLanguages, patchSecurity, settingsKeys } from '../api';
import { useSettingsMutation } from './use-settings-mutation';

/** D-76 SSO + chính sách mật khẩu & bảo mật (D-33, D-44): vá từng phần, ghi audit */
export function useSecurity() {
  const toast = useToast();
  const q = useQuery({ queryKey: settingsKeys.security, queryFn: fetchSecurity });
  const m = useSettingsMutation({ key: settingsKeys.security, fn: patchSecurity, write: true });
  return {
    data: q.data,
    patch: (p: SecurityPatch, msg: string) => m.mutate(p, { onSuccess: () => toast(msg) }),
  };
}

/** D-77 Ngôn ngữ: mặc định + bật/tắt từng ngôn ngữ */
export function useLanguages() {
  const toast = useToast();
  const q = useQuery({ queryKey: settingsKeys.languages, queryFn: fetchLanguages });
  const m = useSettingsMutation({ key: settingsKeys.languages, fn: patchLanguages, write: true });
  return {
    data: q.data,
    patch: (p: LanguagePatch, msg: string) => m.mutate(p, { onSuccess: () => toast(msg) }),
    toast,
  };
}
