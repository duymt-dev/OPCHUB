import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@opchub/ui';
import { DEFAULT_APP_NOTIFY } from '@opchub/shared/api-domains';
import { messages as sourceMessages } from '@/i18n/messages';
const settings = sourceMessages.settings;
import common from '../../../../messages/vi/common.json';
import * as api from '../app-notify-api';
import { AppNotifyTab } from './app-notify-tab';
vi.mock('../app-notify-api', async (original) => ({
  ...(await original<typeof api>()),
  fetchAppNotify: vi.fn(),
  saveAppNotify: vi.fn(),
  testAppNotify: vi.fn(),
  fetchDeviceConfig: vi.fn(),
}));
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
          <AppNotifyTab />
        </ToastProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.fetchAppNotify).mockResolvedValue(structuredClone(DEFAULT_APP_NOTIFY));
  vi.mocked(api.saveAppNotify).mockResolvedValue(structuredClone(DEFAULT_APP_NOTIFY));
  vi.mocked(api.testAppNotify).mockResolvedValue({ ok: true, deviceCount: 0 });
  vi.mocked(api.fetchDeviceConfig).mockResolvedValue({
    enabled: false,
    vapidPublicKey: '',
    kinds: DEFAULT_APP_NOTIFY.push,
  });
});
afterEach(cleanup);
describe('REQ-629 app settings draft only, D-125', () => {
  it('shows six switches with store off; changes persist only on save', async () => {
    mount();
    await screen.findByRole('heading', { name: settings.app.heading });
    expect(screen.getAllByRole('switch')).toHaveLength(6);
    expect(
      screen.getByRole('switch', { name: settings.app.store }).getAttribute('aria-checked'),
    ).toBe('false');
    fireEvent.click(screen.getByRole('switch', { name: settings.app.pwa }));
    expect(api.saveAppNotify).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: settings.app.save }));
    await waitFor(() =>
      expect(vi.mocked(api.saveAppNotify).mock.calls[0]?.[0]).toEqual({
        ...DEFAULT_APP_NOTIFY,
        pwa: false,
      }),
    );
  });
  it('test action calls only Admin endpoint and does not save the draft', async () => {
    mount();
    await screen.findByRole('heading', { name: settings.app.heading });
    fireEvent.click(screen.getByRole('switch', { name: settings.app.msg }));
    fireEvent.click(screen.getByRole('button', { name: settings.app.test }));
    await waitFor(() => expect(api.testAppNotify).toHaveBeenCalledTimes(1));
    expect(api.saveAppNotify).not.toHaveBeenCalled();
    expect(
      screen.getByRole('switch', { name: settings.app.msg }).getAttribute('aria-checked'),
    ).toBe('false');
  });
});
