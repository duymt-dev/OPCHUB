import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import settings from '../../../../messages/vi/settings.json';
import { AppNotifyDevice } from './app-notify-device';

const device = vi.hoisted(() => ({ state: 'off', enabled: true, toggle: vi.fn() }));
vi.mock('../hooks/use-app-notify-device', () => ({
  useAppNotifyDevice: () => ({
    state: device.state,
    busy: false,
    error: null,
    config: { data: { enabled: device.enabled } },
    toggle: device.toggle,
  }),
}));
const mount = () =>
  render(
    <NextIntlClientProvider locale="vi" messages={{ settings }}>
      <AppNotifyDevice />
    </NextIntlClientProvider>,
  );
afterEach(() => {
  cleanup();
  device.state = 'off';
  device.enabled = true;
  device.toggle.mockClear();
});
describe('D-137 Admin receiving device', () => {
  it('has an explicit enable gesture for the acting Admin', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: settings.app.device.enable }));
    expect(device.toggle).toHaveBeenCalledTimes(1);
  });
  it('explains denied permission without re-prompting', () => {
    device.state = 'denied';
    mount();
    expect(screen.getByRole('status').textContent).toBe(settings.app.device.denied);
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
  });
  it('hides the device block when PWA or provider is disabled', () => {
    device.enabled = false;
    mount();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
