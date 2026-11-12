import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@opchub/ui';
import { buildBankDemoRows } from '@opchub/shared/mock-domains';
import { messages as sourceMessages } from '@/i18n/messages';
const settings = sourceMessages.settings;
import common from '../../../../messages/vi/common.json';
import * as api from '../bank-api';
import { BankTab } from './bank-tab';

vi.mock('@/lib/permissions', () => ({
  useGrants: () => ({
    keys: ['settings.general', 'fees.action'],
    previewing: false,
    roleName: 'test',
  }),
}));
vi.mock('@/features/fees', () => ({
  MatchDialog: () => <div role="dialog">Existing match dialog</div>,
}));
vi.mock('../bank-api', async (original) => ({
  ...(await original<typeof api>()),
  fetchBank: vi.fn(),
  fetchBankTxns: vi.fn(),
  patchBank: vi.fn(),
  rotateBankKey: vi.fn(),
  testBank: vi.fn(),
  simulateBank: vi.fn(),
  shortBank: vi.fn(),
  exportBank: vi.fn(),
}));
const config = {
  autoActivate: true,
  provider: 'fake' as const,
  keyHint: 'demo',
  webhookUrl: 'http://localhost:4300/v1/webhooks/bank',
  bankName: 'Vietcombank',
  accountNo: '123',
  accountName: 'Media Soft',
  canSimulate: true,
  counts: { matched: 2, pending: 2 },
};
const mount = (
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  }),
) =>
  render(
    <NextIntlClientProvider locale="vi" timeZone="Asia/Ho_Chi_Minh" messages={{ settings, common }}>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <BankTab />
        </ToastProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: () => false,
    }),
  });
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.fetchBank).mockResolvedValue(config);
  vi.mocked(api.fetchBankTxns).mockResolvedValue({ items: buildBankDemoRows(), nextCursor: null });
  vi.mocked(api.patchBank).mockImplementation((autoActivate) =>
    Promise.resolve({
      ...config,
      autoActivate,
    }),
  );
  vi.mocked(api.rotateBankKey).mockResolvedValue({
    key: 'one-time-demo-key-abcdefghijklmnopqrstuvwxyz',
    hint: 'wxyz',
  });
  vi.mocked(api.shortBank).mockResolvedValue(null);
});
afterEach(cleanup);
describe('REQ-621 bank tab', () => {
  it('providers fake: unsupported dimmed, SePay unselected, no provider mutation; D-123 syntax', async () => {
    mount();
    await screen.findByText('Cổng nhận giao dịch');
    const fake = screen.getByRole('button', { name: 'Giả lập (dev)' });
    expect(fake.getAttribute('aria-pressed')).toBe('true');
    for (const label of ['Casso', 'SePay', 'Vietcombank API']) {
      const b = screen.getByRole('button', { name: new RegExp(label) });
      expect(b.getAttribute('aria-disabled')).toBe('true');
      fireEvent.click(b);
    }
    expect(screen.getAllByText('Chưa hỗ trợ')).toHaveLength(2);
    expect(api.patchBank).not.toHaveBeenCalled();
    expect(screen.getByText('OPCHUB <Mã TV> <SĐT>')).toBeTruthy();
    expect(screen.queryByText('OPC <SĐT> <GÓI>')).toBeNull();
  });
  it('providers SePay production: selected adapter, fake and simulate absent', async () => {
    vi.mocked(api.fetchBank).mockResolvedValue({
      ...config,
      provider: 'sepay',
      canSimulate: false,
    });
    mount();
    await screen.findByText('Cổng nhận giao dịch');
    expect(screen.getByRole('button', { name: 'SePay' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Giả lập (dev)' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Mô phỏng giao dịch đến' })).toBeNull();
  });
  it('toggle persists immediately, unlike renewal draft; no Save button', async () => {
    mount();
    const sw = await screen.findByRole('switch', { name: 'Tự kích hoạt khi khớp' });
    fireEvent.click(sw);
    await waitFor(() => expect(vi.mocked(api.patchBank).mock.calls[0]?.[0]).toBe(false));
    await waitFor(() => expect(sw.getAttribute('aria-checked')).toBe('false'));
    expect(screen.queryByRole('button', { name: 'Lưu cấu hình' })).toBeNull();
  });
  it('rotation confirms no grace, one-time plaintext disappears after close and never enters query cache', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mount(client);
    fireEvent.click(await screen.findByRole('button', { name: 'Tạo lại' }));
    expect(screen.getByText(/Khóa cũ ngừng hoạt động ngay/)).toBeTruthy();
    expect(api.rotateBankKey).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận tạo lại' }));
    await screen.findByDisplayValue('one-time-demo-key-abcdefghijklmnopqrstuvwxyz');
    for (const data of [
      client
        .getQueryCache()
        .getAll()
        .map((q) => q.state.data),
      client
        .getMutationCache()
        .getAll()
        .map((m) => m.state.data),
    ]) {
      expect(JSON.stringify(data)).not.toContain('one-time-demo-key-abcdefghijklmnopqrstuvwxyz');
    }
    fireEvent.click(screen.getAllByRole('button', { name: 'Đóng' }).at(-1)!);
    expect(screen.queryByDisplayValue('one-time-demo-key-abcdefghijklmnopqrstuvwxyz')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tạo lại' }));
    expect(screen.queryByDisplayValue('one-time-demo-key-abcdefghijklmnopqrstuvwxyz')).toBeNull();
  });
  it('short note required, sends note without activation; existing match dialog reused', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Ghi nhận thiếu' }));
    const submit = screen.getAllByRole('button', { name: 'Ghi nhận thiếu' }).at(-1)!;
    expect(submit.hasAttribute('disabled')).toBe(true);
    fireEvent.change(screen.getByLabelText('Ghi chú (bắt buộc, tối đa 500 ký tự)'), {
      target: { value: 'Đã liên hệ' },
    });
    fireEvent.click(submit);
    await waitFor(() =>
      expect(vi.mocked(api.shortBank).mock.calls[0]?.[0]).toEqual({
        id: 'bank-demo-5',
        note: 'Đã liên hệ',
      }),
    );
    await waitFor(() =>
      expect(screen.queryByLabelText('Ghi chú (bắt buộc, tối đa 500 ký tự)')).toBeNull(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Gán cho thành viên' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
  it('empty and retry states are explicit', async () => {
    vi.mocked(api.fetchBankTxns).mockResolvedValue({ items: [], nextCursor: null });
    mount();
    expect(await screen.findByText('Chưa có giao dịch ngân hàng')).toBeTruthy();
    cleanup();
    vi.mocked(api.fetchBank).mockRejectedValueOnce(new Error('offline'));
    mount();
    expect(await screen.findByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Cổng nhận giao dịch')).toBeTruthy();
  });
});
