import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@opchub/ui';
import { DEFAULT_RENEWAL } from '@opchub/shared/api-domains';
import settings from '../../../../messages/vi/settings.json';
import common from '../../../../messages/vi/common.json';
import * as api from '../renewal-api';
import { RenewalTab } from './renewal-tab';
vi.mock('../renewal-api', async (original) => ({
  ...(await original<typeof api>()),
  fetchRenewal: vi.fn(),
  saveRenewal: vi.fn(),
  fetchRenewalMembers: vi.fn(),
  sendRenewal: vi.fn(),
}));
const row = {
  userId: 'u1',
  name: 'Nguyễn Test',
  email: 'renewal@test.vn',
  plan: 'personal' as const,
  validUntil: '2026-12-31T00:00:00Z',
  daysLeft: 12,
  nextMilestone: 'D30' as const,
  lastSentAt: null,
};
const mount = () =>
  render(
    <NextIntlClientProvider locale="vi" timeZone="Asia/Ho_Chi_Minh" messages={{ settings, common }}>
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
          })
        }
      >
        <ToastProvider>
          <RenewalTab />
        </ToastProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {
        return undefined;
      }
      unobserve() {
        return undefined;
      }
      disconnect() {
        return undefined;
      }
    },
  );
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.fetchRenewal).mockResolvedValue(structuredClone(DEFAULT_RENEWAL));
  vi.mocked(api.fetchRenewalMembers).mockResolvedValue({
    total: 1,
    items: [row],
    nextCursor: null,
  });
  vi.mocked(api.saveRenewal).mockResolvedValue(structuredClone(DEFAULT_RENEWAL));
  vi.mocked(api.sendRenewal).mockResolvedValue({ sent: 1, channels: ['email', 'app'] });
});
afterEach(cleanup);
describe('REQ-620 renewal tab', () => {
  it('shows three milestones and two channels, no Zalo, data and last sent', async () => {
    mount();
    await screen.findByText('Nguyễn Test');
    expect(screen.getAllByRole('switch')).toHaveLength(5);
    expect(screen.queryByText(/Zalo/)).toBeNull();
    expect(screen.getByText('Chưa gửi')).toBeTruthy();
    expect(screen.getByText('Còn 12 ngày')).toBeTruthy();
  });
  it('TC-471 all local channels off: warning and no send request', async () => {
    mount();
    await screen.findByRole('switch', { name: 'Email (Brevo)' });
    fireEvent.click(screen.getByRole('switch', { name: 'Email (Brevo)' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Thông báo trong hệ thống' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gửi nhắc tất cả' }));
    expect(api.sendRenewal).not.toHaveBeenCalled();
    expect(api.saveRenewal).not.toHaveBeenCalled();
    expect(screen.getAllByText('Bật ít nhất 1 kênh gửi').length).toBeGreaterThan(0);
  });
  it('config draft only saved on explicit button, entire config submitted', async () => {
    mount();
    await screen.findByRole('switch', { name: '30 ngày trước hạn' });
    fireEvent.click(screen.getByRole('switch', { name: '30 ngày trước hạn' }));
    expect(api.saveRenewal).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu cấu hình' }));
    await waitFor(() =>
      expect(api.saveRenewal).toHaveBeenCalledWith(
        { ...DEFAULT_RENEWAL, milestones: { d30: false, d7: true, d1: true } },
        expect.anything(),
      ),
    );
  });
  it('TC-472 send one refreshes last sent; send all uses all:true', async () => {
    mount();
    await screen.findByText('Nguyễn Test');
    vi.mocked(api.fetchRenewalMembers).mockResolvedValue({
      total: 1,
      items: [{ ...row, lastSentAt: new Date().toISOString() }],
      nextCursor: null,
    });
    fireEvent.click(screen.getByRole('button', { name: /^Gửi nhắc$/ }));
    await screen.findByText('Đã gửi vài giây trước');
    expect(api.sendRenewal).toHaveBeenCalledWith({ userIds: ['u1'] }, expect.anything());
    fireEvent.click(screen.getByRole('button', { name: 'Gửi nhắc tất cả' }));
    await waitFor(() =>
      expect(api.sendRenewal).toHaveBeenCalledWith({ all: true }, expect.anything()),
    );
  });
  it('empty, loading and retry states are explicit', async () => {
    vi.mocked(api.fetchRenewalMembers).mockResolvedValue({ total: 0, items: [], nextCursor: null });
    const view = mount();
    expect(screen.getByRole('status')).toBeTruthy();
    await screen.findByText('Không có thành viên sắp hết hạn trong 30 ngày');
    view.unmount();
    vi.mocked(api.fetchRenewal).mockRejectedValueOnce(new Error('offline'));
    mount();
    await screen.findByRole('button', { name: 'Thử lại' });
  });
});
