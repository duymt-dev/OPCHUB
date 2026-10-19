'use client';

import { languageOptions, LOCALE_COOKIE } from '@opchub/shared/fixtures';
import { AppShell, LanguageSwitch, useToast } from '@opchub/ui';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { logout } from '@/features/auth';
import { openInPlace, PaywallGate } from '@/features/membership';
import { useAuthStore } from '@/lib/auth-store';
import { useChatUnread } from '@/lib/chat-unread';
import { useSessionRevoked } from '@/lib/session-revoked';
import { useWelcomeMail } from '../hooks/use-welcome-mail';
import { activeNav } from '../model';
import { PORTAL_NAV } from '../nav';
import { PortalNotifications } from './portal-notifications';
import { ShellEvents } from './shell-events';
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
  const signOut = useAuthStore((s) => s.signOut);
  const toast = useToast();
  const welcome = useWelcomeMail();
  // NA-25 / BUG-028: số đỏ menu Chat nhóm = tổng chưa đọc thật (thay badge cứng 18)
  const chatUnread = useChatUnread()?.total ?? 0;
  useSessionRevoked();
  if (!me) return null;

  // Hồ sơ không có mục nav: breadcrumb "Hồ sơ cá nhân", không mục nào sáng (giống prototype)
  const onProfile = pathname === '/profile' || pathname.startsWith('/profile/');
  const active = onProfile ? undefined : (activeNav(PORTAL_NAV, pathname) ?? PORTAL_NAV[0]);
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
        ...(n.key === 'chat' && chatUnread > 0 ? { badge: chatUnread } : {}),
      }))}
      activeKey={active?.key ?? ''}
      pageTitle={active ? t(`nav.${active.key}`) : t('shell.profile')}
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
      sidebarExtra={<ShellEvents />}
      onNavigate={(href) => openInPlace(href) || router.push(href)}
      onBack={() => router.push('/dashboard')}
      onProfile={() => router.push('/profile')}
      onLogout={() => {
        void logout().catch(() => undefined);
        // signOut (không phải clear) để AuthGate không chen `/login?next=…`
        signOut();
        router.replace('/login');
        toast(tAuth('login.loggedOut'));
      }}
    >
      {welcome.mail ? null : <PaywallGate />}
      {children}
      {welcome.mail ? (
        <WelcomeMailModal mail={welcome.mail} name={me.fullName} onClose={welcome.close} />
      ) : null}
    </AppShell>
  );
}
