import type { FeeRow } from '@opchub/shared/api-domains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import fees from '../../../../messages/vi/fees.json';
import * as api from '../api';
import { useFeeActions } from './use-fee-actions';

const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock('@opchub/ui', () => ({ useToast: () => toast }));
vi.mock('../api', async (original) => ({
  ...(await original<typeof api>()),
  collectFees: vi.fn(),
  remindFees: vi.fn(),
  feeRowAction: vi.fn(),
}));
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const clear = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NextIntlClientProvider locale="vi" messages={{ fees }}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </NextIntlClientProvider>
  );
  return { ...renderHook(() => useFeeActions(clear), { wrapper }), clear };
}
const director: FeeRow = {
  userId: 'm3',
  memberCode: 'OPC12',
  fullName: 'Director',
  email: 'director@example.test',
  phone: '',
  accountType: 'personal',
  joinedAt: '2026-01-01',
  status: 'regional_director',
  paidAt: null,
  validUntil: null,
  amount: 0,
  groups: [],
};

it('REQ-616 D-120 rejects collect/renew/remind for exempt rows at dispatch boundary', () => {
  const { result } = setup();
  act(() => {
    for (const action of ['collect', 'renew', 'remind'] as const)
      result.current.onRow(director, action);
  });
  expect(api.feeRowAction).not.toHaveBeenCalled();
  expect(toast).not.toHaveBeenCalled();
});

it('REQ-616 bulk collection reports actual updated count, not the selection size', async () => {
  vi.mocked(api.collectFees).mockResolvedValue({ updated: 1 });
  const { result, clear } = setup();
  act(() => result.current.onBulkCollect(['m3', 'm2']));
  await waitFor(() => expect(clear).toHaveBeenCalledOnce());
  expect(vi.mocked(api.collectFees).mock.calls[0]?.[0]).toEqual(['m3', 'm2']);
  expect(toast).toHaveBeenCalledWith('Đã ghi nhận thu phí cho 1 thành viên');
});

it('REQ-616 bulk reminder reports zero queued for exempt selections', async () => {
  vi.mocked(api.remindFees).mockResolvedValue({ queued: 0 });
  const { result, clear } = setup();
  act(() => result.current.onBulkRemind(['m3', 'm9', 'm10']));
  await waitFor(() => expect(clear).toHaveBeenCalledOnce());
  expect(toast).toHaveBeenCalledWith('Đã gửi email nhắc tới 0 thành viên');
});

it('REQ-616 failed collection keeps selection and never reports a successful payment', async () => {
  vi.mocked(api.collectFees).mockRejectedValue(new Error('offline'));
  const { result, clear } = setup();
  act(() => result.current.onBulkCollect(['m2']));
  await waitFor(() => expect(toast).toHaveBeenCalledOnce());
  expect(clear).not.toHaveBeenCalled();
  expect(toast).toHaveBeenCalledWith(fees.toast.failed);
});
