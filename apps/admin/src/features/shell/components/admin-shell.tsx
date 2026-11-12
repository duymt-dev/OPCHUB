'use client';

import { AdminSearch } from './admin-search';
import { AppShell, useToast } from '@opchub/ui';
import { AdminLanguageSwitch } from './admin-language-switch';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { languageOptions, LOCALE_COOKIE } from '@opchub/shared/fixtures';
import { logout } from '@/features/auth';
import { useAuthStore } from '@/lib/auth-store';
import { useSessionEndNavigator } from '@/lib/session-end-navigator';
import { numberText } from '@/i18n/number-text';
import { useNavBadges } from '../hooks/use-nav-badges';
import { useAdminNav } from '../hooks/use-admin-nav';
import { useMenuMe } from '../hooks/use-menu-me';
import { useRbacErrors } from '../hooks/use-rbac-errors';
import { AdminNotifications } from './admin-notifications';
import { ForbiddenPanel } from './forbidden-panel';
import { PreviewBanner } from './preview-banner';
import { ViewOnlyZone } from './view-only-zone';

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
  'settings',
] as const;

function AdminShellBody({
  allowed,
  readOnly,
  roleName,
  showReadOnlyNotice,
  home,
  children,
}: {
  allowed: boolean;
  readOnly: boolean;
  roleName: string;
  showReadOnlyNotice: boolean;
  home: string;
  children: ReactNode;
}) {
  if (allowed) {
    return (
      <ViewOnlyZone
        readOnly={readOnly}
        role={roleName}
        showNotice={showReadOnlyNotice}
        banner={<PreviewBanner />}
      >
        {children}
      </ViewOnlyZone>
    );
  }
  return (
    <>
      <PreviewBanner />
      <ForbiddenPanel home={home} />
    </>
  );
}

/**
 * Khung Admin: sidebar theo 25 khoá §21 (RB-R06) + topbar; nội dung bọc dải xem thử (RB-R09) và
 * chế độ chỉ xem (RB-R07). Trang con chỉ render nội dung.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const t = useTranslations('common');
  const tAuth = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const me = useAuthStore((s) => s.me);
  const signOut = useAuthStore((s) => s.signOut);
  const toast = useToast();
  const badges = useNavBadges();
  const nav = useAdminNav();
  useRbacErrors();
  useMenuMe();
  useSessionEndNavigator();
  if (!me) return null;

  const { items, current, allowed, readOnly, grants, home, canSettings } = nav;
  const active = (current && allowed ? current : undefined) ?? items[0];
  const labels = Object.fromEntries(SHELL_KEYS.map((k) => [k, t(`shell.${k}`)])) as Record<
    (typeof SHELL_KEYS)[number],
    string
  >;

  return (
    <AppShell
      logoSrc="/opchub-logo.png"
      logoAlt="OPC HUB ASEAN – One Person Company Hub"
      brandTag={t('shell.brandTag')}
      formatBadgeCount={(count) => numberText(count, locale)}
      nav={items.map((n, i) => ({
        key: n.key,
        label: t(`nav.${n.key}`),
        href: n.href,
        icon: n.icon,
        // Tiêu đề nhóm chỉ trên mục đầu còn hiện của nhóm (vai trò thiếu quyền mất cả nhóm)
        ...(n.group && items[i - 1]?.group !== n.group ? { group: t(`navGroup.${n.group}`) } : {}),
        ...(badges[n.key] ? { badge: badges[n.key] } : {}),
      }))}
      activeKey={active?.key ?? 'overview'}
      pageTitle={
        pathname === '/profile' ? t('shell.profile') : t(`nav.${active?.key ?? 'overview'}`)
      }
      user={{
        name: me.name,
        subtitle: me.roleName ?? '',
        avatarColor: '#722ED1',
        ...(me.avatarUrl ? { avatarUrl: me.avatarUrl } : {}),
      }}
      labels={labels}
      notifications={<AdminNotifications />}
      language={
        <AdminLanguageSwitch
          title={tAuth('langTitle')}
          current={locale}
          options={languageOptions}
          cookieName={LOCALE_COOKIE}
          variant="topbar"
        />
      }
      search={<AdminSearch />}
      onNavigate={(href) => router.push(href)}
      onProfile={() => router.push('/profile')}
      {...(canSettings ? { onSettings: () => router.push('/settings') } : {})}
      onBack={() => router.push('/overview')}
      onLogout={() => {
        void logout().catch(() => undefined);
        // signOut (không phải clear) để AuthGate không chen `/login?next=…`
        signOut();
        router.replace('/login');
        toast(tAuth('login.loggedOut'));
      }}
    >
      <AdminShellBody
        allowed={allowed}
        readOnly={readOnly}
        roleName={grants.roleName}
        home={home}
        showReadOnlyNotice={!grants.previewing || current?.key !== 'affiliate'}
      >
        {children}
      </AdminShellBody>
    </AppShell>
  );
}
