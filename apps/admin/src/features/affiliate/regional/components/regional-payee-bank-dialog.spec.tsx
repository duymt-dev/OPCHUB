import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { affiliateTestContext, setupAffiliateBrowser } from '../../tests/context';
import { RegionalPayeeBankDialog } from './regional-payee-bank-dialog';
import type { RegionalSlot } from '@opchub/shared/api-domains';

const write = vi.hoisted(() => ({
  mutate: vi.fn<(bank: RegionalSlot['bank'], options: { onSuccess: () => void }) => void>(),
  isPending: false,
}));
vi.mock('../hooks/use-regional-payee-bank', () => ({ useRegionalPayeeBank: () => write }));
beforeEach(() => {
  setupAffiliateBrowser();
  write.mutate.mockReset();
});
afterEach(cleanup);

it('SPEC4 retired payee dialog reuses bank validation and never submits until explicit Save', async () => {
  render(
    <RegionalPayeeBankDialog
      region="north"
      payee={{
        userId: 'old-director',
        fullName: 'Former director',
        due: 1000,
        monthKeys: ['2026-10'],
        bank: null,
      }}
    />,
    affiliateTestContext(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Nhập tài khoản nhận' }));
  expect(screen.getByRole('dialog')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Ngân hàng'), { target: { value: 'Fixture Bank' } });
  fireEvent.change(screen.getByLabelText('Số tài khoản'), { target: { value: '987654321' } });
  fireEvent.change(screen.getByLabelText('Chủ tài khoản'), { target: { value: 'OLD DIRECTOR' } });
  expect(write.mutate).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole('button', { name: 'Lưu' }));
  await waitFor(() => expect(write.mutate).toHaveBeenCalledTimes(1));
  expect(write.mutate.mock.calls[0]?.[0]).toEqual({
    bankName: 'Fixture Bank',
    bankNo: '987654321',
    bankHolder: 'OLD DIRECTOR',
  });
  expect(typeof write.mutate.mock.calls[0]?.[1].onSuccess).toBe('function');
});
