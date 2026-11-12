'use client';

import { adminChangePasswordSchema, type AdminChangePasswordRequest } from '@opchub/shared/api';
import { useMutation } from '@tanstack/react-query';
import { Form } from 'antd';
import { useTranslations } from 'next-intl';
import { useToast } from '@opchub/ui';
import { useAuthStore } from '@/lib/auth-store';
import { changePassword } from '../api';
import { useProfileErrors } from './use-profile-errors';

const FIELDS = ['currentPassword', 'newPassword', 'confirmPassword'] as const;

export function useProfilePassword() {
  const t = useTranslations('common.adminProfile');
  const toast = useToast();
  const [form] = Form.useForm<AdminChangePasswordRequest>();
  const showErrors = useProfileErrors(form, FIELDS, t('failed'));
  const mutation = useMutation({
    mutationFn: async (body: AdminChangePasswordRequest) =>
      changePassword(adminChangePasswordSchema.parse(body)),
    onSuccess: (session) => {
      useAuthStore.getState().setSession(session.accessToken, session.admin);
      form.resetFields();
      toast(t('passwordSaved'));
    },
    onError: (error) => {
      const message = showErrors(error);
      if (message) toast(message);
    },
  });
  return { form, mutation };
}
