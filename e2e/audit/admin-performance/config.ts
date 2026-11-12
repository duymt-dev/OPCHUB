import { z } from 'zod';
import { realpathSync, statSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';

export const locales = ['vi', 'en', 'th'] as const;
export const routes = ['/login', '/overview', '/profile', '/settings'] as const;
export const performanceConfig = z
  .object({
    version: z.enum(['baseline', 'current']),
    source: z.string().regex(/^[0-9a-f]{7,40}$/),
    root: z.string().min(1),
    dist: z.string().regex(/^\.next[-a-z0-9]+$/),
    output: z.string().min(1),
    origin: z.url().refine((value) => {
      const url = new URL(value);
      return (
        url.protocol === 'http:' &&
        ['127.0.0.1', 'localhost'].includes(url.hostname) &&
        Number(url.port) > 1024 &&
        ![3000, 3001, 4000, 5432, 6379].includes(Number(url.port))
      );
    }, 'Only an explicit isolated local audit listener is allowed'),
  })
  .strict();

export function auditConfig(value: unknown) {
  const config = performanceConfig.parse(value);
  const root = realpathSync(config.root);
  const build = realpathSync(resolve(root, 'apps/admin', config.dist));
  const rel = relative(root, build);
  if (rel.startsWith('..') || isAbsolute(rel) || !statSync(build).isDirectory())
    throw new Error('Build must be inside its explicit archive/workspace root');
  return { ...config, root, build };
}

export type AuditConfig = ReturnType<typeof auditConfig>;
