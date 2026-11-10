'use client';

import { Button, Card, Form, Input } from 'antd';
import { UploadImage, UserAvatar } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useAdminProfile } from '../hooks/use-admin-profile';
import styles from './profile.module.css';

export function ProfileDetails() {
  const t = useTranslations('common.adminProfile');
  const { me, form, avatar, upload, uploading, mutation, toast } = useAdminProfile();
  if (!me) return null;
  return (
    <Card title={t('personal')}>
      <Form
        form={form}
        layout="vertical"
        onFinish={(body) => mutation.mutate(body)}
        disabled={mutation.isPending || uploading}
      >
        <div className={styles.avatar}>
          <UserAvatar
            name={me.name}
            src={avatar}
            size={72}
            color="#722ED1"
            fallback={avatar ? 'image' : 'initials'}
          />
          <UploadImage
            label={t('upload')}
            tooLargeMessage={t('imageRule')}
            upload={upload}
            onChange={(url) => form.setFieldValue('avatarUrl', url)}
            onError={toast}
            trigger={<Button loading={uploading}>{t('upload')}</Button>}
          />
          {avatar ? (
            <Button onClick={() => form.setFieldValue('avatarUrl', null)}>{t('remove')}</Button>
          ) : null}
        </div>
        <p className={styles.hint}>{t('imageRule')}</p>
        <Form.Item name="avatarUrl" hidden>
          <Input />
        </Form.Item>
        <Form.Item
          name="name"
          label={t('name')}
          rules={[{ required: true, message: t('nameRequired') }]}
        >
          <Input autoComplete="name" maxLength={100} />
        </Form.Item>
        <Form.Item label={t('email')} htmlFor="admin-profile-email" extra={t('emailHint')}>
          <Input id="admin-profile-email" value={me.email} disabled />
        </Form.Item>
        <Form.Item name="phone" label={t('phone')}>
          <Input autoComplete="tel" maxLength={30} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={mutation.isPending} disabled={uploading}>
          {t('save')}
        </Button>
      </Form>
    </Card>
  );
}
