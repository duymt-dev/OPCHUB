import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import styles from './public.module.css';

export async function PublicHeader() {
  const t = await getTranslations('stores.guest');
  return (
    <header className={styles.header}>
      <Link href="/" aria-label="OPC Hub" className={styles.brand}>
        <Image src="/opchub-logo.png" alt="OPC Hub" width={100} height={36} />
      </Link>
      <nav>
        <a href="/login">{t('login')}</a>
        <a href="/register">{t('join')}</a>
      </nav>
    </header>
  );
}
