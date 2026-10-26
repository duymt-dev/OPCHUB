'use client';

import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api-client';
import { memberKeys, remindOnboarding, type AdminMember } from '../api';

/**
 * V4-611 (D-88) "Nhắc" ở cột Khởi đầu: server gửi thông báo + email, ≤ 1 lần / 24 giờ.
 * 409 (đã đủ 8 bước) / 429 (đã nhắc) → toast đúng thông điệp server; xong thì tải lại danh sách.
 */
export function useOnboardingRemind() {
  const t = useTranslations('members.toast');
  const toast = useToast();
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (member: AdminMember) => remindOnboarding(member.id),
    onSuccess: (_r, member) => toast(t('reminded', { name: member.fullName })),
    onError: (e) => toast(e instanceof ApiError ? e.message : t('failed')),
    onSettled: () => void qc.invalidateQueries({ queryKey: memberKeys.all }),
  });
  return (member: AdminMember) => m.mutate(member);
}
