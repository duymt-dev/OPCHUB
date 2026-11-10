'use client';

import { Button, Card, Form, Input } from 'antd';
import { useTranslations } from 'next-intl';
import { useProfilePassword } from '../hooks/use-profile-password';

export function PasswordCard() {
  const t = useTranslations('common.adminProfile');
  const { form, mutation } = useProfilePassword();
  return (
    <Card title={t('passwordTitle')}>
      <Form
        form={form}
        layout="vertical"
        onFinish={(body) => mutation.mutate(body)}
        disabled={mutation.isPending}
      >
        <Form.Item name="currentPassword" label={t('currentPassword')}>
          <Input.Password autoComplete="current-password" maxLength={128} />
        </Form.Item>
        <Form.Item name="newPassword" label={t('newPassword')} extra={t('passwordRule')}>
          <Input.Password autoComplete="new-password" maxLength={128} />
        </Form.Item>
        <Form.Item name="confirmPassword" label={t('confirmPassword')}>
          <Input.Password autoComplete="new-password" maxLength={128} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={mutation.isPending}>
          {t('changePassword')}
        </Button>
      </Form>
    </Card>
  );
}
