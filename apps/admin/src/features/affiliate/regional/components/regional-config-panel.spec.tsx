import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { affiliateTestContext } from '../../tests/context';
import { RegionalConfigPanel } from './regional-config-panel';

vi.mock('@/lib/permissions', () => ({
  useCan: () => false,
  useGrants: () => ({ roleName: 'Kế toán', keys: ['affiliate.view'], previewing: false }),
}));
vi.mock('../hooks/use-regional-directors', () => ({
  useRegionalDirectors: () => ({
    isError: false,
    data: { items: [], history: [], canManage: false, unassignedProvinces: 0 },
  }),
}));
afterEach(cleanup);

describe('TIP-V46-812 local read-only hint is separate from coverage notice', () => {
  it('retains the permission explanation and denies management actions', () => {
    render(<RegionalConfigPanel />, affiliateTestContext());
    const hint = screen.getByText(/Vai trò Kế toán chỉ được xem/);
    expect(hint.className).toContain('readonlyNotice');
    const coverage = screen.getByText('Tất cả 34 tỉnh/thành đã có GĐ Vùng phụ trách');
    expect(coverage.className).not.toContain('readonlyNotice');
    expect(screen.queryByRole('button', { name: '+ Bổ nhiệm GĐ Vùng' })).toBeNull();
  });
});
