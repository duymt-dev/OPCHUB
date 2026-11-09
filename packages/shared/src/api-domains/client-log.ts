import { z } from 'zod';

export const clientLogSchema = z
  .object({
    app: z.enum(['portal', 'admin']),
    scope: z.string().min(1).max(80),
    message: z.string().max(500),
    name: z.string().min(1).max(80),
    digest: z
      .string()
      .regex(/^\d{1,20}$/)
      .optional(),
    path: z
      .string()
      .startsWith('/')
      .max(200)
      .refine((v) => !/[?#]/.test(v)),
    at: z.iso.datetime(),
  })
  .strict();
export type ClientLog = z.infer<typeof clientLogSchema>;

const ROUTES = new Set([
  'dashboard',
  'affiliate',
  'projects',
  'events',
  'chat',
  'settings',
  'members',
  'fees',
  'login',
  'register',
  'stores',
  'needs',
  'marketing',
  'audit',
  'profile',
]);
/** Only fixed route/scope labels leave the browser, even for Error messages containing PII. */
export function sanitizeClientLog(input: ClientLog): ClientLog {
  const scope = input.scope === 'affiliate.my-region' ? input.scope : 'app';
  const segments = input.path.split(/[?#]/, 1)[0]?.split('/').filter(Boolean) ?? [];
  if (/^[a-z]{2}$/.test(segments[0] ?? '')) segments.shift();
  const route = segments[0];
  return {
    app: input.app,
    scope,
    message: scope === 'affiliate.my-region' ? 'GET /me/gdv failed' : 'Client application error',
    name: ['Error', 'TypeError', 'RangeError', 'AbortError', 'NetworkError'].includes(input.name)
      ? input.name
      : 'Error',
    ...(input.digest && /^\d{1,20}$/.test(input.digest) ? { digest: input.digest } : {}),
    path: route && ROUTES.has(route) ? `/${route}` : '/',
    at: input.at,
  };
}
