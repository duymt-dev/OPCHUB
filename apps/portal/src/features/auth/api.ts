import { loginResponseSchema } from '@opchub/shared/api';
import type { LoginRequest } from '@opchub/shared/api';
import { api } from '@/lib/api-client';

export const login = (body: LoginRequest) =>
  api('/auth/login', { method: 'POST', body, schema: loginResponseSchema });
