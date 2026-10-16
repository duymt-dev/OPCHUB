import { loginResponseSchema } from '@opchub/shared/api';
import type { LoginRequest } from '@opchub/shared/api';
import { z } from 'zod';
import { api } from '@/lib/api-client';

const empty = z.null();

export const login = (body: LoginRequest) =>
  api('/auth/login', { method: 'POST', body, schema: loginResponseSchema });

export const logout = () => api('/auth/logout', { method: 'POST', schema: empty });

export const forgotPassword = (email: string) =>
  api('/auth/password/forgot', { method: 'POST', body: { email }, schema: empty });
