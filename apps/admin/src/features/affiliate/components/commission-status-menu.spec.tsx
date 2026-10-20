import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGrants } from '@/lib/permissions';
import { affiliateTestContext, setupAffiliateBrowser } from '../tests/context';
import { CommissionStatusMenu } from './commission-status-menu';

vi.mock('@/lib/permissions', () => ({ useGrants: vi.fn() }));
beforeAll(setupAffiliateBrowser);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useGrants).mockReturnValue({
    keys: ['affiliate.view', 'affiliate.action'],
    roleName: 'Any role name',
    previewing: false,
  });
});
afterEach(cleanup);

async function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: /^Chuyển trạng thái$/ }));
  return screen.findAllByRole('menuitem');
}

describe('REQ-310 REQ-312 commission menu preserves visible states and terminal invariants', () => {
  it.each([
    ['recorded', 'Đã ghi nhận'],
    ['paid', 'Đã chi trả'],
    ['cancelled', 'Đã hủy'],
  ] as const)(
    'marks only the current %s status while keeping it non-actionable',
    async (status, label) => {
      render(
        <CommissionStatusMenu row={{ id: 'current-1', status }} cancel={vi.fn()} />,
        affiliateTestContext(),
      );
      await openMenu();
      const item = screen.getByRole('menuitem', { name: label });
      expect(item.getAttribute('aria-disabled')).toBe('true');
      expect(item.querySelector('.anticon-check')).not.toBeNull();
      expect(document.querySelectorAll('[role="menuitem"] .anticon-check')).toHaveLength(1);
    },
  );

  it('recorded shows all three statuses, but only cancellation delegates to the reason dialog', async () => {
    const cancel = vi.fn();
    render(
      <CommissionStatusMenu row={{ id: 'commission-1', status: 'recorded' }} cancel={cancel} />,
      affiliateTestContext(),
    );
    expect(await openMenu()).toHaveLength(3);
    expect(
      screen.getByRole('menuitem', { name: 'Đã ghi nhận' }).getAttribute('aria-disabled'),
    ).toBe('true');
    const paid = screen.getByRole('menuitem', { name: 'Đã chi trả' });
    expect(paid.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(paid);
    expect(cancel).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Hủy hoa hồng' }));
    expect(cancel).toHaveBeenCalledExactlyOnceWith(['commission-1']);
  });

  it.each(['paid', 'cancelled'] as const)(
    '%s remains inspectable without any write or restore',
    async (status) => {
      const cancel = vi.fn();
      render(
        <CommissionStatusMenu row={{ id: 'terminal-1', status }} cancel={cancel} />,
        affiliateTestContext(),
      );
      const items = await openMenu();
      expect(items).toHaveLength(3);
      for (const item of items) {
        expect(item.getAttribute('aria-disabled')).toBe('true');
        fireEvent.click(item);
      }
      expect(cancel).not.toHaveBeenCalled();
    },
  );

  it.each([false, true])(
    'view-only/preview=%s can inspect statuses, never cancel',
    async (previewing) => {
      vi.mocked(useGrants).mockReturnValue({
        keys: previewing ? ['affiliate.view', 'affiliate.action'] : ['affiliate.view'],
        roleName: 'Any role name',
        previewing,
      });
      const cancel = vi.fn();
      render(
        <CommissionStatusMenu row={{ id: 'recorded-1', status: 'recorded' }} cancel={cancel} />,
        affiliateTestContext(),
      );
      const trigger = screen.getByRole('button', { name: 'Chuyển trạng thái' });
      expect(trigger.hasAttribute('data-ro-ok')).toBe(true);
      for (const item of await openMenu()) {
        expect(item.getAttribute('aria-disabled')).toBe('true');
        fireEvent.click(item);
      }
      expect(cancel).not.toHaveBeenCalled();
    },
  );

  it('revoked action permission disables an already-open cancellation menu', async () => {
    const cancel = vi.fn();
    const view = render(
      <CommissionStatusMenu row={{ id: 'recorded-1', status: 'recorded' }} cancel={cancel} />,
      affiliateTestContext(),
    );
    await openMenu();
    vi.mocked(useGrants).mockReturnValue({
      keys: ['affiliate.view'],
      roleName: 'Any role name',
      previewing: false,
    });
    view.rerender(
      <CommissionStatusMenu row={{ id: 'recorded-1', status: 'recorded' }} cancel={cancel} />,
    );
    const item = screen.getByRole('menuitem', { name: 'Hủy hoa hồng' });
    expect(item.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(item);
    expect(cancel).not.toHaveBeenCalled();
  });
});
