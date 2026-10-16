'use client';

import { hasPermission } from '@opchub/shared';
import { AppShell, SidebarEventCard, useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { logout } from '@/features/auth';
import { useAuthStore } from '@/lib/auth-store';
import { ADMIN_NAV, MOCK_BADGES } from '../nav';
import { AdminNotifications } from './admin-notifications';

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

/** Khung Admin: sidebar 10 mục theo quyền + topbar; trang con chỉ render nội dung */
export function AdminShell({ children }: { children: ReactNode }) {
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const me = useAuthStore((s) => s.me);
  const signOut = useAuthStore((s) => s.signOut);
  const toast = useToast();
  const tAuth = useTranslations('auth.login');
  if (!me) return null;

  const items = ADMIN_NAV.filter((n) => hasPermission(me.systemRole, n.permission));
  const active = items.find((n) => pathname.startsWith(n.href)) ?? items[0];
  const labels = Object.fromEntries(SHELL_KEYS.map((k) => [k, t(`shell.${k}`)])) as Record<
    (typeof SHELL_KEYS)[number],
    string
  >;

  return (
    <AppShell
      logoSrc="/opchub-logo.png"
      logoAlt="OPC HUB ASEAN – One Person Company Hub"
      brandTag={t('shell.brandTag')}
      nav={items.map((n) => ({
        key: n.key,
        label: t(`nav.${n.key}`),
        href: n.href,
        icon: n.icon,
        ...(MOCK_BADGES[n.key] ? { badge: MOCK_BADGES[n.key] } : {}),
      }))}
      activeKey={active?.key ?? 'overview'}
      pageTitle={t(`nav.${active?.key ?? 'overview'}`)}
      user={{
        name: me.fullName,
        subtitle: t(`role.${me.systemRole}`),
        avatarColor: '#722ED1',
        avatarText: 'QT',
        ...(me.avatarUrl ? { avatarUrl: me.avatarUrl } : {}),
      }}
      labels={labels}
      notifications={<AdminNotifications />}
      sidebarExtra={
        <SidebarEventCard
          title={t('shell.nextEvent')}
          body={t('shell.nextEventBody')}
          linkLabel={t('shell.viewDetail')}
          onOpen={() => router.push('/events')}
        />
      }
      onNavigate={(href) => router.push(href)}
      onBack={() => router.push('/overview')}
      onLogout={() => {
        void logout().catch(() => undefined);
        // signOut (không phải clear) để AuthGate không chen `/login?next=…`
        signOut();
        router.replace('/login');
        toast(tAuth('loggedOut'));
      }}
    >
      {children}
    </AppShell>
  );
}
