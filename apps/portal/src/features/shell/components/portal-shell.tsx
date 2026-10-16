'use client';

import { languageOptions, LOCALE_COOKIE } from '@opchub/shared/fixtures';
import { AppShell, LanguageSwitch, SidebarEventCard, useToast } from '@opchub/ui';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { logout } from '@/features/auth';
import { useAuthStore } from '@/lib/auth-store';
import { useWelcomeMail } from '../hooks/use-welcome-mail';
import { activeNav } from '../model';
import { PORTAL_NAV, PORTAL_NAV_BADGES } from '../nav';
import { PortalNotifications } from './portal-notifications';
import { WelcomeMailModal } from './welcome-mail-modal';

const SHELL_KEYS = [
  'navTitle',
  'search',
  'notifications',
  'menu',
  'back',
  'collapse',
  'expand',
  'language',
  'profile',
  'logout',
] as const;

/** Khung User Portal: thông báo theo người (D-29), ngôn ngữ, menu người dùng, mail chào mừng (P-05) */
export function PortalShell({ children }: { children: ReactNode }) {
  const t = useTranslations('common');
  const tAuth = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const me = useAuthStore((s) => s.me);
  const clear = useAuthStore((s) => s.clear);
  const toast = useToast();
  const welcome = useWelcomeMail();
  if (!me) return null;

  const active = activeNav(PORTAL_NAV, pathname) ?? PORTAL_NAV[0];
  const labels = Object.fromEntries(SHELL_KEYS.map((k) => [k, t(`shell.${k}`)])) as Record<
    (typeof SHELL_KEYS)[number],
    string
  >;

  return (
    <AppShell
      logoSrc="/opchub-logo.png"
      logoAlt="OPC HUB ASEAN – One Person Company Hub"
      nav={PORTAL_NAV.map((n) => ({
        key: n.key,
        label: t(`nav.${n.key}`),
        href: n.href,
        icon: n.icon,
        ...(PORTAL_NAV_BADGES[n.key] ? { badge: PORTAL_NAV_BADGES[n.key] } : {}),
      }))}
      activeKey={active?.key ?? 'dashboard'}
      pageTitle={t(`nav.${active?.key ?? 'dashboard'}`)}
      user={{
        name: me.fullName,
        subtitle: t('shell.memberSub'),
        ...(me.avatarUrl ? { avatarUrl: me.avatarUrl } : {}),
      }}
      labels={labels}
      notifications={<PortalNotifications />}
      language={
        <LanguageSwitch
          title={tAuth('langTitle')}
          current={locale}
          options={languageOptions}
          cookieName={LOCALE_COOKIE}
        />
      }
      sidebarExtra={
        <SidebarEventCard
          title={t('shell.nextEvent')}
          body={t('shell.nextEventBody')}
          linkLabel={t('shell.viewDetail')}
          onOpen={() => router.push('/events')}
        />
      }
      onNavigate={(href) => router.push(href)}
      onBack={() => router.push('/dashboard')}
      onProfile={() => router.push('/profile')}
      onLogout={() => {
        void logout().catch(() => undefined);
        clear();
        toast(tAuth('login.loggedOut'));
        router.replace('/login');
      }}
    >
      {children}
      {welcome.mail ? (
        <WelcomeMailModal mail={welcome.mail} name={me.fullName} onClose={welcome.close} />
      ) : null}
    </AppShell>
  );
}
