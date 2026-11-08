import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_NOTIFY } from '@opchub/shared/api-domains';
import profile from '../../../../messages/vi/profile.json';
import * as api from '../push-api';
import { PushPreferences } from './push-preferences';

vi.mock('../push-api', async (original) => ({
  ...(await original<typeof api>()),
  fetchPushPreferences: vi.fn(),
  savePushPreferences: vi.fn(),
}));
vi.mock('./push-enable-button', () => ({ PushEnableButton: () => null }));
function mount() {
  return render(
    <NextIntlClientProvider locale="vi" messages={{ profile }}>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <PushPreferences
          config={{ enabled: true, vapidPublicKey: '', kinds: DEFAULT_APP_NOTIFY.push }}
        />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}
beforeEach(() => {
  vi.mocked(api.fetchPushPreferences).mockResolvedValue({ ...DEFAULT_APP_NOTIFY.push });
  vi.mocked(api.savePushPreferences).mockImplementation((body) => Promise.resolve(body));
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe('D-137 member preferences', () => {
  it('shows five kinds, locks the Admin-disabled kind and saves a complete strict preference object', async () => {
    mount();
    const event = await screen.findByRole('switch', { name: profile.push.event });
    await waitFor(() => expect(event.hasAttribute('disabled')).toBe(false));
    expect(screen.getAllByRole('switch')).toHaveLength(5);
    expect(screen.getByRole('switch', { name: profile.push.store }).hasAttribute('disabled')).toBe(
      true,
    );
    expect(screen.getByText(profile.push.adminOff)).toBeDefined();
    fireEvent.click(event);
    await waitFor(() =>
      expect(api.savePushPreferences).toHaveBeenCalledWith(
        { ...DEFAULT_APP_NOTIFY.push, event: false },
        expect.anything(),
      ),
    );
    await waitFor(() => expect(event.getAttribute('aria-checked')).toBe('false'));
  });
  it('offers retry instead of editing unknown preferences when loading fails', async () => {
    vi.mocked(api.fetchPushPreferences).mockRejectedValueOnce(new Error('offline'));
    mount();
    const retry = await screen.findByRole('button', { name: profile.push.retry });
    expect(screen.getAllByRole('switch').every((node) => node.hasAttribute('disabled'))).toBe(true);
    fireEvent.click(retry);
    await waitFor(() => expect(api.fetchPushPreferences).toHaveBeenCalledTimes(2));
  });
});
