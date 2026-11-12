import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { z } from 'zod';
import { authOverrides } from '@opchub/shared/fixtures';
import type { AuditConfig, locales } from './config';

type Json = z.infer<ReturnType<typeof z.json>>;
const isObject = (value: Json): value is Record<string, Json> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export function bytes(value: string | Buffer) {
  const body = typeof value === 'string' ? Buffer.from(value) : value;
  return {
    bytes: body.length,
    gzip: gzipSync(body, { level: 6 }).length,
    sha256: createHash('sha256').update(body).digest('hex'),
  };
}

/** Parse JSON data only, never execute script. Ignore non-JSON Flight protocol rows. */
export function flightCatalog(html: string) {
  let flight = '';
  for (const script of html.matchAll(/<script\b[^>]*>(.*?)<\/script>/gs)) {
    const text = script[1] ?? '';
    if (!text.startsWith('self.__next_f.push(')) continue;
    const item = z.array(z.json()).parse(JSON.parse(text.slice(19, -1)) as unknown);
    if (item[0] === 1) flight += z.string().parse(item[1]);
  }
  const catalogs: { locale: string; messages: Record<string, Json> }[] = [];
  const walk = (value: Json): void => {
    if (Array.isArray(value)) for (const child of value) walk(child);
    else if (isObject(value)) {
      if (typeof value.locale === 'string' && value.messages && isObject(value.messages))
        catalogs.push({ locale: value.locale, messages: value.messages });
      for (const child of Object.values(value)) walk(child);
    }
  };
  for (const line of flight.split('\n')) {
    const row = line.match(/^[0-9a-f]+:([[{].*)$/)?.[1];
    if (row) walk(z.json().parse(JSON.parse(row) as unknown));
  }
  if (catalogs.length !== 1 || !catalogs[0])
    throw new Error(`Expected exactly one client catalog, found ${catalogs.length}`);
  return { ...catalogs[0], flight: bytes(flight) };
}

const sourceNames = [
  'affiliate',
  'auth',
  'bots',
  'common',
  'events',
  'fees',
  'groups',
  'investors',
  'marketing',
  'members',
  'needs',
  'overview',
  'projects',
  'reports',
  'requests',
  'stores',
] as const;
const parts = ['core', 'access', 'mail', 'audit', 'finance', 'ai'] as const;
export function expectedCatalog(config: AuditConfig, locale: (typeof locales)[number]) {
  const bundle = config.version === 'baseline' ? 'vi' : locale;
  const read = (file: string) =>
    z
      .record(z.string(), z.json())
      .parse(
        JSON.parse(
          readFileSync(resolve(config.root, `apps/admin/messages/${bundle}/${file}.json`), 'utf8'),
        ) as unknown,
      );
  const messages: Record<string, Json> = Object.fromEntries(
    sourceNames.map((key) => [key, read(key)]),
  );
  if (config.version === 'baseline') {
    messages.settings = read('settings');
    if (locale !== 'vi') {
      const auth = read('auth');
      const login = z.record(z.string(), z.json()).parse(auth.login);
      const override = authOverrides(locale);
      messages.auth = {
        ...auth,
        language: override.languageNative,
        login: { ...login, ...override.login },
      };
    }
  } else {
    messages.meta = read('meta');
    messages.ui = read('ui');
    messages.botOptions = read('bot-options');
    messages.settings = Object.assign(
      {},
      ...parts.map((part) => read(`settings/${part}`)),
    ) as Record<string, Json>;
  }
  return messages;
}
