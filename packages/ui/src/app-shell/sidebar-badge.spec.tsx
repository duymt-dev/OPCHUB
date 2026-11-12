import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './app-shell';
import type { AppShellProps } from './types';

// Keep the real AppShell forwarding, Sidebar and mini-state; topbar is outside this contract.
vi.mock('./topbar', () => ({ Topbar: () => null }));

const props: AppShellProps = {
  logoSrc: '/logo.png',
  logoAlt: 'OPC HUB',
  nav: [
    { key: 'groups', label: 'Groups', href: '/groups?tab=list#raw', icon: 'groups', badge: 1234 },
    { key: 'empty', label: 'Empty', href: '/empty', icon: 'groups', badge: 0 },
    { key: 'absent', label: 'Absent', href: '/absent', icon: 'groups' },
  ],
  activeKey: 'groups',
  pageTitle: 'Groups',
  user: { name: 'Raw name', subtitle: 'Raw role' },
  labels: {
    navTitle: 'Navigation',
    search: 'Search',
    notifications: 'Notifications',
    menu: 'Menu',
    back: 'Back',
    collapse: 'Collapse',
    expand: 'Expand',
    language: 'Language',
    profile: 'Profile',
    logout: 'Logout',
  },
  children: null,
};

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('D-141 AC824-08/11 optional AppShell badge presentation', () => {
  it('retains unformatted Portal defaults and native hrefs without opt-in', () => {
    render(<AppShell {...props} />);
    const link = screen.getByRole('link', { name: 'Groups1234' });
    expect(link.getAttribute('href')).toBe('/groups?tab=list#raw');
    expect(link.getAttribute('aria-current')).toBe('page');
    expect(link.textContent).toBe('Groups1234');
  });

  it('forwards the optional formatter through real AppShell with untouched numeric input', () => {
    const formatBadgeCount = vi.fn((value: number) => new Intl.NumberFormat('my-MM').format(value));
    render(<AppShell {...props} formatBadgeCount={formatBadgeCount} />);
    expect(screen.getByRole('link', { name: 'Groups၁,၂၃၄' })).toBeTruthy();
    expect(formatBadgeCount).toHaveBeenCalledWith(1234);
    expect(props.nav[0]?.badge).toBe(1234);
    expect(typeof props.nav[0]?.badge).toBe('number');
  });

  it('does not format zero/absent badges or change the existing visible dot condition', () => {
    const formatBadgeCount = vi.fn((value: number) => `#${value}`);
    const { container } = render(<AppShell {...props} formatBadgeCount={formatBadgeCount} />);
    expect(formatBadgeCount.mock.calls).toEqual([[1234]]);
    expect(
      screen.getByRole('link', { name: 'Empty' }).querySelector('span:nth-of-type(2)'),
    ).toBeNull();
    expect(screen.getByRole('link', { name: 'Absent' }).querySelector('i')).toBeNull();
    expect(container.querySelectorAll('nav a i[aria-hidden="true"]')).toHaveLength(1);
  });

  it('updates formatted presentation on rerender and restores raw defaults when omitted', () => {
    const { rerender } = render(<AppShell {...props} formatBadgeCount={(n) => `first:${n}`} />);
    expect(screen.getByText('first:1234')).toBeTruthy();
    rerender(<AppShell {...props} formatBadgeCount={(n) => `second:${n}`} />);
    expect(screen.getByText('second:1234')).toBeTruthy();
    expect(screen.queryByText('first:1234')).toBeNull();
    rerender(<AppShell {...props} />);
    expect(screen.getByText('1234')).toBeTruthy();
  });

  it('keeps the raw navigation callback and badge/dot while collapsed', () => {
    const onNavigate = vi.fn();
    const { container } = render(
      <AppShell {...props} formatBadgeCount={(n) => `count:${n}`} onNavigate={onNavigate} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Collapse' }));
    expect(container.querySelector('aside')?.getAttribute('data-mini')).toBe('true');
    const link = screen.getByRole('link', { name: 'Groupscount:1234' });
    expect(link.querySelector('i[aria-hidden="true"]')).toBeTruthy();
    fireEvent.click(link);
    expect(onNavigate.mock.calls).toEqual([['/groups?tab=list#raw']]);
    expect(container.querySelector('aside')?.getAttribute('data-open')).toBe('false');
    expect(props.nav[0]?.badge).toBe(1234);
  });
});
