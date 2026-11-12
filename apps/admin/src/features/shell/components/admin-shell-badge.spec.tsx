import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { AppShellProps } from '@opchub/ui';
import { AdminShell } from './admin-shell';

const state = vi.hoisted(() => ({
  locale: 'my',
  push: vi.fn(),
  badges: { groups: 1234, members: 0 },
  shell: undefined as AppShellProps | undefined,
}));

// Observe the real AdminShell -> shared UI contract; shared tests exercise the actual Sidebar.
vi.mock('@opchub/ui', () => ({
  AppShell: (props: AppShellProps) => {
    state.shell = props;
    return (
      <nav>
        {props.nav.map((item) => (
          <button key={item.key} onClick={() => props.onNavigate?.(item.href)}>
            {item.label}
            {item.badge ? props.formatBadgeCount?.(item.badge) : ''}
          </button>
        ))}
      </nav>
    );
  },
  LanguageSwitch: () => null,
  useToast: () => vi.fn(),
}));
vi.mock('next-intl', () => ({
  useLocale: () => state.locale,
  useTranslations: () => (key: string) => key,
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/groups',
  useRouter: () => ({ push: state.push, replace: vi.fn() }),
}));
vi.mock('@/features/auth', () => ({ logout: vi.fn() }));
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (select: (value: { me: { name: string }; signOut: () => void }) => unknown) =>
    select({ me: { name: 'Untranslated name' }, signOut: vi.fn() }),
}));
vi.mock('@/lib/session-end-navigator', () => ({ useSessionEndNavigator: () => undefined }));
vi.mock('../hooks/use-nav-badges', () => ({ useNavBadges: () => state.badges }));
vi.mock('../hooks/use-admin-nav', () => ({
  useAdminNav: () => ({
    items: [
      { key: 'groups', href: '/groups?tab=list#unchanged', icon: 'groups' },
      { key: 'members', href: '/members', icon: 'groups' },
    ],
    current: { key: 'groups' },
    allowed: true,
    readOnly: false,
    grants: { roleName: 'Raw role', previewing: false },
    home: '/overview',
    canSettings: false,
  }),
}));
vi.mock('../hooks/use-menu-me', () => ({ useMenuMe: () => undefined }));
vi.mock('../hooks/use-rbac-errors', () => ({ useRbacErrors: () => undefined }));
vi.mock('./admin-search', () => ({ AdminSearch: () => null }));
vi.mock('./admin-notifications', () => ({ AdminNotifications: () => null }));

afterEach(() => {
  cleanup();
  state.locale = 'my';
  state.shell = undefined;
  state.push.mockClear();
});

it('D-141 AC824-08/11 Admin opts in to live Myanmar/VI/English badge digits without changing raw values', () => {
  const { rerender } = render(<AdminShell>Body</AdminShell>);
  expect(screen.getByText('nav.groups၁,၂၃၄')).toBeTruthy();
  expect(state.shell?.formatBadgeCount?.(0)).toBe('၀');
  expect(state.shell?.nav[0]?.badge).toBe(1234);
  expect(state.shell?.nav[1]?.badge).toBeUndefined();
  expect(state.shell?.user.name).toBe('Untranslated name');
  fireEvent.click(screen.getByText('nav.groups၁,၂၃၄'));
  expect(state.push.mock.calls).toEqual([['/groups?tab=list#unchanged']]);

  state.locale = 'vi';
  rerender(<AdminShell>Body</AdminShell>);
  expect(screen.getByText('nav.groups1.234')).toBeTruthy();
  expect(state.shell?.nav[0]?.badge).toBe(1234);
  state.locale = 'en';
  rerender(<AdminShell>Body</AdminShell>);
  expect(screen.getByText('nav.groups1,234')).toBeTruthy();
  expect(state.shell?.nav[0]?.badge).toBe(1234);
  expect(state.badges).toEqual({ groups: 1234, members: 0 });
});
