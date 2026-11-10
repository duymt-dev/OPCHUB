'use client';

import { adminUpdateProfileSchema, type AdminUpdateProfileRequest } from '@opchub/shared/api';
import { IMAGE_MAX_BYTES, isImageMime } from '@opchub/shared/api-domains';
import { useMutation } from '@tanstack/react-query';
import { Form } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@opchub/ui';
import { useAuthStore } from '@/lib/auth-store';
import { uploadImage } from '@/lib/upload-image';
import { updateProfile } from '../api';
import { profileFormErrors } from '../form-errors';

export function useAdminProfile() {
  const t = useTranslations('common.adminProfile');
  const toast = useToast();
  const me = useAuthStore((s) => s.me);
  const [form] = Form.useForm<AdminUpdateProfileRequest>();
  const avatar = Form.useWatch('avatarUrl', form);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (me) form.setFieldsValue({ name: me.name, phone: me.phone, avatarUrl: me.avatarUrl });
  }, [me, form]);
  const mutation = useMutation({
    mutationFn: async (body: AdminUpdateProfileRequest) =>
      updateProfile(adminUpdateProfileSchema.parse(body)),
    onSuccess: (updated) => {
      useAuthStore.getState().setMe(updated);
      toast(t('saved'));
    },
    onError: (error) => {
      // Avatar is a hidden form value: its server error must be a visible toast, not hidden help.
      const message = profileFormErrors(form, error, ['name', 'phone'], t('failed'));
      if (message) toast(message);
    },
  });
  const upload = async (file: File) => {
    if (!isImageMime(file.type) || file.size > IMAGE_MAX_BYTES) throw new Error(t('imageRule'));
    setUploading(true);
    try {
      return await uploadImage(file, 'avatar');
    } finally {
      setUploading(false);
    }
  };
  return { me, form, avatar, upload, uploading, mutation, toast };
}
