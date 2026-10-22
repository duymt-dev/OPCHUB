import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoginPanel } from './login-panel';
import type { LoginLabels } from './types';

const labels = new Proxy({} as LoginLabels, {
  get: (_, key) => (key === 'submit' ? 'Đăng nhập' : String(key)),
});

function deferred() {
  let resolve: (value: string | undefined) => void = () => undefined;
  const promise = new Promise<string | undefined>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('LoginPanel', () => {
  it('P5-MSW-RESET-PENDING-01 UAT-11 keeps the exact submit name while a login is pending', async () => {
    const pending = deferred();
    const onSubmit = vi.fn(() => pending.promise);
    render(<LoginPanel labels={labels} sso={[]} demoAccounts={[]} onSubmit={onSubmit} />);
    const submit = screen.getByRole('button', { name: 'Đăng nhập' });

    fireEvent.click(submit);
    // AntD prepends its loading icon label; the accessible action name must not change.
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBe(submit);
    expect(submit.className).toContain('ant-btn-loading');

    await act(async () => {
      pending.resolve('Email hoặc mật khẩu không đúng');
      await pending.promise;
    });
    expect(screen.getByRole('alert').textContent).toBe('Email hoặc mật khẩu không đúng');
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBe(submit);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
