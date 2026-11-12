import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type * as Ui from '@opchub/ui';
import { mockAdminMeOf } from '@opchub/shared/mock-domains';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import source from '../../../../messages/vi/auth.json';
import english from '../../../../messages/en/auth.json';
import viUi from '../../../../messages/vi/ui.json';
import enUi from '../../../../messages/en/ui.json';
import { ForgotScreen } from '../components/forgot-screen';
import { LoginScreen } from '../components/login-screen';
import { ResetScreen } from '../components/reset-screen';
import { TotpStep } from '../components/totp-step';
import { TwoFactorForm } from '../components/two-factor-form';
import { useFirstPassword } from '../hooks/use-first-password';
import * as api from '../api';

const state = vi.hoisted(() => ({
  toast: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
  token: 'valid-token',
}));
vi.mock('@opchub/ui', async (original) => ({
  ...(await original<typeof Ui>()),
  useToast: () => state.toast,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: state.replace, push: state.push }),
  useSearchParams: () => new URLSearchParams(state.token ? { token: state.token } : {}),
}));
vi.mock('../components/auth-frame', () => ({
  AuthFrame: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('../api', () => ({
  login: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  verifyTotp: vi.fn(),
  setupTwoFactor: vi.fn(),
  enableTwoFactor: vi.fn(),
  changeFirstPassword: vi.fn(),
  logout: vi.fn(),
}));
beforeEach(() => {
  vi.clearAllMocks();
  state.token = 'valid-token';
  vi.mocked(api.setupTwoFactor).mockResolvedValue({
    secretMasked: '***',
    otpauthUrl: 'otpauth://test',
  });
  const me = mockAdminMeOf('admin');
  if (!me) throw new Error('Missing fixture');
  useAuthStore.getState().setSession('unchanged-token', me);
});

it('D-141 AC824-10 Admin LoginPanel local error changes live without losing draft or calling login', async () => {
  const c = context();
  const view = render(<LoginScreen />, { wrapper: c.wrapper });
  fireEvent.change(screen.getByPlaceholderText(source.login.emailPlaceholder), {
    target: { value: 'draft@example.test' },
  });
  fireEvent.click(screen.getByRole('button', { name: source.login.submit }));
  await screen.findByText(source.login.errorEmpty);
  c.current.locale = 'en';
  view.rerender(<LoginScreen />);
  expect(screen.getByText(english.login.errorEmpty)).toBeTruthy();
  expect(screen.getByPlaceholderText<HTMLInputElement>(english.login.emailPlaceholder).value).toBe(
    'draft@example.test',
  );
  expect(api.login).not.toHaveBeenCalled();
});

it('D-141 AC824-12 Admin LoginPanel raw API errors remain raw despite matching local text', async () => {
  vi.mocked(api.login).mockRejectedValue(new ApiError('FORBIDDEN', 403, source.login.errorEmpty));
  const c = context();
  const view = render(<LoginScreen />, { wrapper: c.wrapper });
  fireEvent.change(screen.getByPlaceholderText(source.login.emailPlaceholder), {
    target: { value: 'draft@example.test' },
  });
  fireEvent.change(screen.getByPlaceholderText(source.login.passwordPlaceholder), {
    target: { value: 'Password1' },
  });
  fireEvent.click(screen.getByRole('button', { name: source.login.submit }));
  await screen.findByText(source.login.errorEmpty);
  c.current.locale = 'en';
  view.rerender(<LoginScreen />);
  expect(screen.getByRole('alert').textContent).toBe(source.login.errorEmpty);
  expect(api.login).toHaveBeenCalledWith({
    identifier: 'draft@example.test',
    password: 'Password1',
    remember: true,
  });
});
afterEach(() => {
  cleanup();
  useAuthStore.getState().clear();
});

function context() {
  const current = { locale: 'vi' as 'vi' | 'en' };
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider
        locale={current.locale}
        timeZone="Asia/Ho_Chi_Minh"
        messages={{
          auth: current.locale === 'vi' ? source : english,
          ui: current.locale === 'vi' ? viUi : enUi,
        }}
      >
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
  return { current, wrapper };
}

it('D-141 AC824-10 forgot local email error changes live without losing the draft or making a request', () => {
  const c = context();
  const view = render(<ForgotScreen />, { wrapper: c.wrapper });
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'invalid-draft' } });
  fireEvent.click(screen.getByRole('button', { name: source.forgot.submit }));
  expect(screen.getByText(source.forgot.errEmail)).toBeTruthy();
  c.current.locale = 'en';
  view.rerender(<ForgotScreen />);
  expect(screen.getByText(english.forgot.errEmail)).toBeTruthy();
  expect(screen.getByRole<HTMLInputElement>('textbox').value).toBe('invalid-draft');
  expect(api.forgotPassword).not.toHaveBeenCalled();
});

it.each(['totp', 'setup'] as const)(
  'D-141 AC824-10 %s keeps code, updates local six-digit error, and never submits invalid data',
  async (kind) => {
    const c = context();
    const node =
      kind === 'totp' ? (
        <TotpStep mfaToken="mfa" onDone={vi.fn()} onBack={vi.fn()} />
      ) : (
        <TwoFactorForm required onDone={vi.fn()} onCancel={vi.fn()} />
      );
    const view = render(node, { wrapper: c.wrapper });
    if (kind === 'setup') await screen.findByTestId('totp-secret');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '12' } });
    fireEvent.submit(screen.getByRole('textbox').closest('form')!);
    expect(screen.getByText(source.totp.errCode)).toBeTruthy();
    c.current.locale = 'en';
    view.rerender(node);
    expect(screen.getByText(english.totp.errCode)).toBeTruthy();
    expect(screen.getByRole<HTMLInputElement>('textbox').value).toBe('12');
    expect(api.verifyTotp).not.toHaveBeenCalled();
    expect(api.enableTwoFactor).not.toHaveBeenCalled();
  },
);

it.each(['totp', 'setup'] as const)(
  'D-141 AC824-12 %s backend text stays raw even when equal to the local message',
  async (kind) => {
    const raw = new ApiError('VALIDATION_ERROR', 400, source.totp.errCode, [
      { path: 'code', message: source.totp.errCode },
    ]);
    vi.mocked(api.verifyTotp).mockRejectedValue(raw);
    vi.mocked(api.enableTwoFactor).mockRejectedValue(raw);
    const c = context();
    const node =
      kind === 'totp' ? (
        <TotpStep mfaToken="mfa" onDone={vi.fn()} onBack={vi.fn()} />
      ) : (
        <TwoFactorForm required onDone={vi.fn()} onCancel={vi.fn()} />
      );
    const view = render(node, { wrapper: c.wrapper });
    if (kind === 'setup') await screen.findByTestId('totp-secret');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '123456' } });
    fireEvent.submit(screen.getByRole('textbox').closest('form')!);
    await screen.findByText(source.totp.errCode);
    c.current.locale = 'en';
    view.rerender(node);
    expect(screen.getByText(source.totp.errCode)).toBeTruthy();
    expect(screen.queryByText(english.totp.errCode)).toBeNull();
    expect(useAuthStore.getState().accessToken).toBe('unchanged-token');
  },
);

it('D-141 AC824-10 missing reset token text changes live without a request', () => {
  state.token = '';
  const c = context();
  const view = render(<ResetScreen />, { wrapper: c.wrapper });
  expect(screen.getByText(source.reset.missingToken)).toBeTruthy();
  c.current.locale = 'en';
  view.rerender(<ResetScreen />);
  expect(screen.getByText(english.reset.missingToken)).toBeTruthy();
  expect(api.resetPassword).not.toHaveBeenCalled();
});

it('D-141 AC824-10 reset mismatch changes live and preserves both password drafts', () => {
  const c = context();
  const view = render(<ResetScreen />, { wrapper: c.wrapper });
  const password = screen.getByPlaceholderText(source.reset.newPasswordPlaceholder);
  const confirm = screen.getByPlaceholderText(source.reset.confirmPlaceholder);
  fireEvent.change(password, { target: { value: 'NewPassword1' } });
  fireEvent.change(confirm, { target: { value: 'Different2' } });
  fireEvent.submit(password.closest('form')!);
  expect(screen.getByText(source.reset.errMismatch)).toBeTruthy();
  c.current.locale = 'en';
  view.rerender(<ResetScreen />);
  expect(screen.getByText(english.reset.errMismatch)).toBeTruthy();
  expect(
    screen.getByPlaceholderText<HTMLInputElement>(english.reset.newPasswordPlaceholder).value,
  ).toBe('NewPassword1');
  expect(
    screen.getByPlaceholderText<HTMLInputElement>(english.reset.confirmPlaceholder).value,
  ).toBe('Different2');
  expect(api.resetPassword).not.toHaveBeenCalled();
});

it('D-141 AC824-10 first-password strength/equality errors switch without changing draft/session/predicates', async () => {
  const c = context();
  const h = renderHook(() => useFirstPassword(), { wrapper: c.wrapper });
  act(() => {
    h.result.current.setPwd('weak');
    h.result.current.setConfirm('weak');
  });
  await act(() => h.result.current.submit());
  expect(h.result.current.errors.newPassword).toBe(viUi.errors.adminPasswordRule);
  c.current.locale = 'en';
  h.rerender();
  expect(h.result.current.errors.newPassword).toBe(enUi.errors.adminPasswordRule);
  expect(h.result.current.pwd).toBe('weak');
  act(() => {
    h.result.current.setPwd('NewPassword1');
    h.result.current.setConfirm('Different2');
  });
  await act(() => h.result.current.submit());
  expect(h.result.current.errors.confirmPassword).toBe(enUi.errors.passwordMismatch);
  expect(api.changeFirstPassword).not.toHaveBeenCalled();
  expect(useAuthStore.getState().accessToken).toBe('unchanged-token');
});

it('D-141 AC824-11/12 first-password sends unchanged fields and does not translate backend field text', async () => {
  const raw = new ApiError('VALIDATION_ERROR', 400, 'raw API', [
    { path: 'newPassword', message: viUi.errors.adminPasswordRule },
  ]);
  vi.mocked(api.changeFirstPassword).mockRejectedValue(raw);
  const c = context();
  const h = renderHook(() => useFirstPassword(), { wrapper: c.wrapper });
  act(() => {
    h.result.current.setPwd('NewPassword1');
    h.result.current.setConfirm('NewPassword1');
  });
  await act(() => h.result.current.submit());
  expect(api.changeFirstPassword).toHaveBeenCalledWith({
    newPassword: 'NewPassword1',
    confirmPassword: 'NewPassword1',
  });
  c.current.locale = 'en';
  h.rerender();
  await waitFor(() =>
    expect(h.result.current.errors.newPassword).toBe(viUi.errors.adminPasswordRule),
  );
  expect(state.replace).not.toHaveBeenCalled();
  expect(useAuthStore.getState().accessToken).toBe('unchanged-token');
});
