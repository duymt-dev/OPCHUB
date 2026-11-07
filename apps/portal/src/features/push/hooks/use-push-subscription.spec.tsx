import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../push-api';
import { usePushSubscription } from './use-push-subscription';

const env = vi.hoisted(() => ({ NEXT_PUBLIC_API_MOCKING: 'off' }));
vi.mock('@/lib/env', () => ({ env }));
vi.mock('../push-api', () => ({ subscribePush: vi.fn(), unsubscribePush: vi.fn() }));
const originalWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
const unsubscribe = vi.fn().mockResolvedValue(true);
const getSubscription = vi.fn();
const subscription = {
  endpoint: 'https://push.invalid/test',
  unsubscribe,
  toJSON: () => ({
    endpoint: 'https://push.invalid/test',
    expirationTime: null,
    keys: { p256dh: 'test', auth: 'test' },
  }),
};
const subscribe = vi.fn().mockResolvedValue(subscription);
const registration = { pushManager: { getSubscription, subscribe } };
const register = vi.fn().mockResolvedValue(registration);
const permission = {
  permission: 'default',
  requestPermission: vi.fn().mockResolvedValue('granted'),
};

beforeEach(() => {
  env.NEXT_PUBLIC_API_MOCKING = 'off';
  permission.permission = 'default';
  getSubscription.mockResolvedValue(null);
  register.mockResolvedValue(registration);
  vi.stubGlobal('Notification', permission);
  vi.stubGlobal('PushManager', class {});
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register, ready: Promise.resolve(registration) },
  });
  vi.mocked(api.subscribePush).mockResolvedValue({ ok: true });
  vi.mocked(api.unsubscribePush).mockResolvedValue({ ok: true });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  if (originalWorker) Object.defineProperty(navigator, 'serviceWorker', originalWorker);
  else Reflect.deleteProperty(navigator, 'serviceWorker');
});
describe('D-137 browser subscription lifecycle', () => {
  it('requests permission only on click, strips expirationTime, then disables the same endpoint', async () => {
    const hook = renderHook(() => usePushSubscription('BA'));
    await waitFor(() => expect(hook.result.current.state).toBe('off'));
    expect(permission.requestPermission).not.toHaveBeenCalled();
    await act(async () => {
      await hook.result.current.toggle();
    });
    expect(permission.requestPermission).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
    expect(api.subscribePush).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: subscription.endpoint,
        keys: { p256dh: 'test', auth: 'test' },
      }),
    );
    expect(vi.mocked(api.subscribePush).mock.calls[0]?.[0]).not.toHaveProperty('expirationTime');
    expect(hook.result.current.state).toBe('on');
    getSubscription.mockResolvedValue(subscription);
    await act(async () => {
      await hook.result.current.toggle();
    });
    expect(api.unsubscribePush).toHaveBeenCalledWith(subscription.endpoint);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(hook.result.current.state).toBe('off');
  });
  it('does not prompt or call the API when permission is already denied', async () => {
    permission.permission = 'denied';
    const hook = renderHook(() => usePushSubscription('BA'));
    await waitFor(() => expect(hook.result.current.state).toBe('denied'));
    await act(async () => {
      await hook.result.current.toggle();
    });
    expect(permission.requestPermission).not.toHaveBeenCalled();
    expect(api.subscribePush).not.toHaveBeenCalled();
  });
  it('never registers a real service worker or prompts while MSW controls the app', async () => {
    env.NEXT_PUBLIC_API_MOCKING = 'msw';
    const hook = renderHook(() => usePushSubscription('BA'));
    await waitFor(() => expect(hook.result.current.state).toBe('unsupported'));
    expect(register).not.toHaveBeenCalled();
    expect(permission.requestPermission).not.toHaveBeenCalled();
  });
});
