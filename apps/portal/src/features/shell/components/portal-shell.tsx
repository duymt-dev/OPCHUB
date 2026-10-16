'use client';

import { AppShell, SidebarEventCard, useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { logout } from '@/features/auth';
import { useAuthStore } from '@/lib/auth-store';
import { PORTAL_NAV } from '../nav';

const SHELL_KEYS = [
  'navTitle',
  'search',
  'notifications',
  'menu',
  'back',
  'collapse',
  'language',
  'profile',
  'logout',
] as const;

/** Khung User Portal; PaywallGate gắn ở L1 */
export function PortalShell({ children }: { children: ReactNode }) {
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const me = useAuthStore((s) => s.me);
  const clear = useAuthStore((s) => s.clear);
  const toast = useToast();
  const tAuth = useTranslations('auth.login');
  if (!me) return null;

  const active = PORTAL_NAV.find((n) => pathname.startsWith(n.href)) ?? PORTAL_NAV[0];
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
      }))}
      activeKey={active?.key ?? 'dashboard'}
      pageTitle={t(`nav.${active?.key ?? 'dashboard'}`)}
      user={{
        name: me.fullName,
        subtitle: t('shell.memberSub'),
        ...(me.avatarUrl ? { avatarUrl: me.avatarUrl } : {}),
      }}
      labels={labels}
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
      onLogout={() => {
        void logout().catch(() => undefined);
        clear();
        toast(tAuth('loggedOut'));
        router.replace('/login');
      }}
    >
      {children}
    </AppShell>
  );
}
