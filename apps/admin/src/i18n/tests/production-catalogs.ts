import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COPY_POLICY } from './production-copy-policy';
import { catalogIssues, type CatalogIssue } from './message-contract';

/** Fixed required identities. Do not replace with readdir or resolved/fallback messages. */
export const REQUIRED_BUNDLES = [
  'vi',
  'en',
  'zh',
  'id',
  'th',
  'ms',
  'fil',
  'km',
  'lo',
  'my',
] as const;
export const REQUIRED_FILES = [
  'affiliate',
  'auth',
  'bot-options',
  'bots',
  'common',
  'events',
  'fees',
  'groups',
  'investors',
  'marketing',
  'members',
  'meta',
  'needs',
  'overview',
  'projects',
  'reports',
  'requests',
  'stores',
  'ui',
  'settings/core',
  'settings/access',
  'settings/mail',
  'settings/audit',
  'settings/finance',
  'settings/ai',
] as const;
export const PRODUCTION_MESSAGES = join(__dirname, '../../../messages');

export function readRawCatalog(root: string, bundle: string, file: string): unknown {
  return JSON.parse(readFileSync(join(root, bundle, `${file}.json`), 'utf8')) as unknown;
}

function leaves(value: unknown, key = ''): [string, string][] {
  if (typeof value === 'string') return [[key, value]];
  return value && typeof value === 'object'
    ? Object.entries(value).flatMap(([part, child]) => leaves(child, key ? `${key}.${part}` : part))
    : [];
}

/** All250 physical files, before any fallback. Unknown ASCII copies fail as well as Vietnamese. */
export function productionCatalogIssues(root = PRODUCTION_MESSAGES): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  const issue = (path: string, reason: string) => issues.push({ path, reason });
  for (const file of REQUIRED_FILES) {
    let source: unknown;
    try {
      source = readRawCatalog(root, 'vi', file);
    } catch {
      issue(`vi/${file}`, 'missing-or-invalid-file');
      continue;
    }
    const sourceLeaves = new Map(leaves(source, file));
    const applicable = [...COPY_POLICY].filter(([key]) => key.startsWith(`${file}.`));
    for (const [key, rule] of applicable)
      if (sourceLeaves.get(key) !== rule.source) issue(`vi/${key}`, 'stale-copy-exception');
    for (const bundle of REQUIRED_BUNDLES) {
      let target: unknown;
      try {
        target = readRawCatalog(root, bundle, file);
      } catch {
        issue(`${bundle}/${file}`, 'missing-or-invalid-file');
        continue;
      }
      const allowed = new Map(
        applicable
          .filter(([, rule]) => rule.locales.has(bundle))
          .map(([key, rule]) => [key, rule.reason]),
      );
      issues.push(
        ...catalogIssues(
          source,
          target,
          {
            locale: bundle,
            sameTextReasons: allowed,
            emptyTextReasons: new Map([
              ['settings/finance.renewal.actions', 'Original blank header'],
            ]),
          },
          file,
        ).map((entry) => ({ ...entry, path: `${bundle}/${entry.path}` })),
      );
      for (const [key, value] of leaves(target, file)) {
        if (/^(?:TODO|TRANSLATE|MISSING)(?::|\s*$)/i.test(value.trim()))
          issue(`${bundle}/${key}`, 'placeholder');
        if (bundle === 'vi') continue;
        if (value !== sourceLeaves.get(key)) continue;
        const rule = COPY_POLICY.get(key);
        if (!rule || rule.source !== value || !rule.locales.has(bundle))
          issue(`${bundle}/${key}`, 'unapproved-source-copy');
      }
    }
  }
  return issues;
}
