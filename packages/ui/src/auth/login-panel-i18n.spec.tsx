import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginPanel } from './login-panel';
import type { DemoAccountItem, LoginLabels } from './types';

afterEach(cleanup);
const labels = new Proxy({} as LoginLabels, { get: (_, key) => String(key) });
const demo: DemoAccountItem = {
  label: 'Sample account',
  email: 'demo@example.test',
  password: 'Demo1',
  tag: 'Admin',
  tone: 'violet',
};

describe('D-141 AC824-10 owner-approved optional LoginPanel formatter', () => {
  it('without the prop retains raw Portal error output and unchanged callback values', async () => {
    const submit = vi.fn().mockResolvedValue('raw API error');
    render(<LoginPanel labels={labels} sso={[]} demoAccounts={[]} onSubmit={submit} />);
    fireEvent.change(screen.getByLabelText('email'), { target: { value: 'draft@example.test' } });
    fireEvent.change(screen.getByLabelText('password'), { target: { value: 'Password1' } });
    fireEvent.click(screen.getByRole('button', { name: 'submit' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('raw API error'));
    expect(submit).toHaveBeenCalledWith({
      identifier: 'draft@example.test',
      password: 'Password1',
      remember: true,
    });
  });
  it('opt-in rerenders an existing error without changing drafts, pending or submit calls; demo still clears it', async () => {
    const submit = vi.fn().mockResolvedValue('stored client error');
    const tree = (locale: string) => (
      <LoginPanel
        labels={labels}
        sso={[]}
        demoAccounts={[demo]}
        onSubmit={submit}
        formatError={(text) => `${locale}:${text}`}
      />
    );
    const view = render(tree('vi'));
    fireEvent.change(screen.getByLabelText('email'), { target: { value: 'draft@example.test' } });
    fireEvent.change(screen.getByLabelText('password'), { target: { value: 'Password1' } });
    fireEvent.click(screen.getByRole('button', { name: 'submit' }));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe('vi:stored client error'),
    );
    view.rerender(tree('en'));
    expect(screen.getByRole('alert').textContent).toBe('en:stored client error');
    expect(screen.getByLabelText<HTMLInputElement>('email').value).toBe('draft@example.test');
    expect(screen.getByLabelText<HTMLInputElement>('password').value).toBe('Password1');
    expect(submit).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Sample account'));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByLabelText<HTMLInputElement>('email').value).toBe(demo.email);
    expect(screen.getByLabelText<HTMLInputElement>('password').value).toBe(demo.password);
  });
  it('external notice bypasses the formatter and successful submission still clears internal errors', async () => {
    const format = vi.fn((value: string) => `formatted:${value}`);
    const submit = vi.fn().mockResolvedValueOnce('error').mockResolvedValueOnce(undefined);
    render(
      <LoginPanel
        labels={labels}
        sso={[]}
        demoAccounts={[]}
        onSubmit={submit}
        formatError={format}
        notice="Raw notice"
      />,
    );
    expect(screen.getByRole('alert').textContent).toBe('Raw notice');
    expect(format).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'submit' }));
      await Promise.resolve();
    });
    expect(screen.getByRole('alert').textContent).toBe('formatted:error');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'submit' }));
      await Promise.resolve();
    });
    expect(screen.getByRole('alert').textContent).toBe('Raw notice');
  });
});
