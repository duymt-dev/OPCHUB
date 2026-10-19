'use client';

import { LegalAndDemo } from '@opchub/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiError } from '@/lib/api-client';
import { confirmUnsubscribe, fetchUnsubscribeInfo } from '../unsubscribe-api';
import { AuthFrame } from './auth-frame';
import styles from './unsubscribe-screen.module.css';

const TOKEN_RE = /^[A-Za-z0-9_-]+\.[A-Fa-f0-9]{64}$/;

/**
 * BUG-036 (NĐ 13/2023): huỷ nhận email chiến dịch từ link chân thư — công khai, không đăng nhập,
 * cùng khung các màn Auth. Hiện email đã che → "Xác nhận huỷ đăng ký" → kết quả. Link sai → báo lỗi.
 */
export function UnsubscribeScreen() {
  const t = useTranslations('auth.unsubscribe');
  const tl = useTranslations('auth.login');
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const valid = TOKEN_RE.test(token);
  const info = useQuery({
    queryKey: ['unsubscribe', token],
    queryFn: () => fetchUnsubscribeInfo(token),
    enabled: valid,
    retry: false,
  });
  const confirm = useMutation({ mutationFn: () => confirmUnsubscribe(token) });
  const failed = !valid || info.isError || confirm.isError;
  const err = info.error ?? confirm.error;
  const message = err instanceof ApiError && err.status !== 400 ? err.message : t('invalid');

  return (
    <AuthFrame>
      <button type="button" className={styles.back} onClick={() => router.push('/login')}>
        {t('back')}
      </button>
      <div className={styles.head}>
        <h1 className={styles.title}>{t('title')}</h1>
        {info.data && !confirm.isSuccess ? (
          <div className={styles.sub}>
            {t('lead')} <span className={styles.email}>{info.data.email}</span>
            {t('tail')}
          </div>
        ) : null}
      </div>
      {failed ? (
        <div role="alert" className={styles.error}>
          {message}
        </div>
      ) : confirm.isSuccess ? (
        <div role="status" className={styles.done}>
          {t('done')}
        </div>
      ) : (
        <button
          type="button"
          className={styles.submit}
          disabled={!info.data || confirm.isPending}
          onClick={() => confirm.mutate()}
        >
          {t('submit')}
        </button>
      )}
      <LegalAndDemo labels={{ terms: tl('terms'), privacy: tl('privacy'), demoTitle: '' }} />
    </AuthFrame>
  );
}
