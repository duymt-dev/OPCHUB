import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { domainContext } from '@/i18n/tests/domain-context';
import { ApiError } from '@/lib/api-client';
import * as api from '../app-notify-api';
import { useAppNotifyDevice } from './use-app-notify-device';

vi.mock('@/lib/env', () => ({ env: { NEXT_PUBLIC_API_MOCKING: 'off' } }));
vi.mock('../app-notify-api', () => ({
  fetchDeviceConfig: vi.fn(),
  registerDevice: vi.fn(),
  unregisterDevice: vi.fn(),
}));
const subscribe = vi.fn();
const permission = vi.fn();
const subscription = {
  endpoint: 'https://push.example.test/endpoint',
  toJSON: () => ({ keys: { p256dh: 'a'.repeat(87), auth: 'a'.repeat(22) } }),
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.fetchDeviceConfig).mockResolvedValue({
    enabled: true,
    vapidPublicKey: 'YQ',
    kinds: { msg: true, need: true, renew: true, event: true, store: true },
  });
  const registration = {
    pushManager: { getSubscription: vi.fn().mockResolvedValue(null), subscribe },
  };
  vi.stubGlobal('navigator', {
    userAgent: 'Desktop',
    platform: 'Win32',
    maxTouchPoints: 0,
    serviceWorker: {
      register: vi.fn().mockResolvedValue(registration),
      ready: Promise.resolve(registration),
    },
  });
  vi.stubGlobal('PushManager', class {});
  vi.stubGlobal('Notification', {
    permission: 'granted',
    requestPermission: permission.mockResolvedValue('granted'),
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('AC824-10 browser subscription failure is local and changes language without retrying the operation', async () => {
  subscribe.mockRejectedValue(new Error('Browser implementation text'));
  const c = domainContext();
  const h = renderHook(useAppNotifyDevice, c);
  await waitFor(() => expect(h.result.current.state).toBe('off'));
  await act(() => h.result.current.toggle());
  expect(h.result.current.error).toBe('Không thể cập nhật thông báo');
  c.current.locale = 'en';
  h.rerender();
  expect(h.result.current.error).toBe('Unable to update notifications');
  expect(subscribe).toHaveBeenCalledTimes(1);
  expect(api.registerDevice).not.toHaveBeenCalled();
  expect(h.result.current.busy).toBe(false);
});
it('AC824-12 register API failure remains raw even when matching a known local translation', async () => {
  subscribe.mockResolvedValue(subscription);
  vi.mocked(api.registerDevice).mockRejectedValue(
    new ApiError('CONFLICT', 409, 'Không thể cập nhật thông báo'),
  );
  const c = domainContext();
  const h = renderHook(useAppNotifyDevice, c);
  await waitFor(() => expect(h.result.current.state).toBe('off'));
  await act(() => h.result.current.toggle());
  expect(api.registerDevice).toHaveBeenCalledTimes(1);
  c.current.locale = 'en';
  h.rerender();
  expect(h.result.current.error).toBe('Không thể cập nhật thông báo');
  expect(h.result.current.state).toBe('off');
});
