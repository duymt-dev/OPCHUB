'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { formatVnd } from '@/features/membership';
import { usePrices } from '@/lib/use-prices';
import styles from './guide-screen.module.css';

/** Các bước theo vòng đời thành viên (SRS §6): Đăng ký → OTP → Đóng phí → Sử dụng → Gia hạn */
const STEPS = ['register', 'otp', 'fee', 'use', 'renew'] as const;

/** Trang tĩnh tối thiểu, không cần đăng nhập; nội dung đầy đủ chờ PM (V2Q-59) */
export function GuideScreen() {
  const t = useTranslations('auth.guide');
  // D-94 5A: giá gói trong bước "Đóng phí" theo Cấu hình bảng giá
  const prices = usePrices();
  const fee = {
    personal: prices ? formatVnd(prices.per.y) : '—',
    business: prices ? formatVnd(prices.biz.y) : '—',
  };
  return (
    <main className={styles.page}>
      <article className={styles.card}>
        <header className={styles.head}>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.sub}>{t('sub')}</p>
        </header>
        <ol className={styles.steps}>
          {STEPS.map((k) => (
            <li key={k} className={styles.step}>
              <h2 className={styles.stepTitle}>{t(`steps.${k}.title`)}</h2>
              <p className={styles.stepBody}>{t(`steps.${k}.body`, fee)}</p>
            </li>
          ))}
        </ol>
        <section className={styles.support}>
          <h2 className={styles.stepTitle}>{t('supportTitle')}</h2>
          <p className={styles.stepBody}>{t('supportBody')}</p>
        </section>
        <div className={styles.actions}>
          <Link href="/login" className={styles.primary}>
            {t('toLogin')}
          </Link>
          <Link href="/register" className={styles.ghost}>
            {t('toRegister')}
          </Link>
        </div>
      </article>
    </main>
  );
}
