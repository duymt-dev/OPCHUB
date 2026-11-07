import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import profile from '../../../../messages/vi/profile.json';
import { PushEnableButton } from './push-enable-button';

const device = vi.hoisted(() => ({ state: 'off', busy: false, error: null, toggle: vi.fn() }));
vi.mock('../hooks/use-push-subscription', () => ({ usePushSubscription: () => device }));
const mount = () =>
  render(
    <NextIntlClientProvider locale="vi" messages={{ profile }}>
      <PushEnableButton publicKey="public-test-key" />
    </NextIntlClientProvider>,
  );
afterEach(() => {
  cleanup();
  device.state = 'off';
  device.toggle.mockClear();
});
describe('D-137 device permission presentation', () => {
  it('enables only from a direct gesture and exposes the active-device disable action', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: profile.push.enable }));
    expect(device.toggle).toHaveBeenCalledTimes(1);
    cleanup();
    device.state = 'on';
    mount();
    expect(screen.getByRole('status').textContent).toBe(profile.push.on);
    expect(screen.getByRole('button', { name: profile.push.disable })).toBeDefined();
  });
  it.each(['unsupported', 'ios', 'denied'] as const)(
    'explains %s without allowing a permission request',
    (state) => {
      device.state = state;
      mount();
      expect(screen.getByRole('status').textContent).toBe(profile.push[state]);
      expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
      fireEvent.click(screen.getByRole('button'));
      expect(device.toggle).not.toHaveBeenCalled();
    },
  );
});
