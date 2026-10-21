import {
  bizLookupSchema,
  loginResponseSchema,
  otpSentSchema,
  ssoCallbackSchema,
} from '@opchub/shared/api';
import type {
  LoginRequest,
  OtpVerifyRequest,
  RegisterBusinessRequest,
  RegisterPersonalRequest,
  ResetPasswordRequest,
  SsoCompleteRequest,
} from '@opchub/shared/api';
import { z } from 'zod';
import { api } from '@/lib/api-client';

const empty = z.null();

export const login = (body: LoginRequest) =>
  api('/auth/login', { method: 'POST', body, schema: loginResponseSchema });

export const logout = () => api('/auth/logout', { method: 'POST', schema: empty });

export const registerPersonal = (body: RegisterPersonalRequest) =>
  api('/auth/register/personal', { method: 'POST', body, schema: otpSentSchema });

export const registerBusiness = (body: RegisterBusinessRequest) =>
  api('/auth/register/business', { method: 'POST', body, schema: otpSentSchema });

export const verifyOtp = (body: OtpVerifyRequest) =>
  api('/auth/otp/verify', { method: 'POST', body, schema: loginResponseSchema });

export const resendOtp = (email: string) =>
  api('/auth/otp/resend', { method: 'POST', body: { email }, schema: otpSentSchema });

export const lookupBiz = (tax: string) =>
  api(`/biz/lookup?tax=${encodeURIComponent(tax)}`, { schema: bizLookupSchema });

export const forgotPassword = (email: string) =>
  api('/auth/password/forgot', { method: 'POST', body: { email }, schema: empty });

/** D-64: `state` phải trùng cookie `opchub_sso` server đặt lúc bắt đầu */
export const ssoCallback = (provider: string, code: string, state: string) =>
  api(`/auth/sso/${provider}/callback?${new URLSearchParams({ code, state }).toString()}`, {
    schema: ssoCallbackSchema,
  });

export const ssoComplete = (body: SsoCompleteRequest) =>
  api('/auth/sso/complete', { method: 'POST', body, schema: loginResponseSchema });

/** QT-02: 204 khi đặt lại xong; link sai/hết hạn hoặc mật khẩu yếu → 400 */
export const resetPassword = (body: ResetPasswordRequest) =>
  api('/auth/password/reset', { method: 'POST', body, schema: empty });
