import { icuContract } from './icu-contract';

export interface CatalogIssue {
  path: string;
  reason: string;
}

export interface CatalogPolicy {
  locale: string;
  sameTextReasons?: ReadonlyMap<string, string>;
  emptyTextReasons?: ReadonlyMap<string, string>;
}

function shape(value: unknown): 'string' | 'array' | 'object' | 'invalid' {
  if (typeof value === 'string') return 'string';
  if (Array.isArray(value)) return 'array';
  if (value !== null && typeof value === 'object') return 'object';
  return 'invalid';
}

function stringIssues(
  source: string,
  target: string,
  path: string,
  policy: CatalogPolicy,
): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  const issue = (reason: string) => issues.push({ path, reason });
  const intentionalEmpty =
    source === '' && target === '' && policy.emptyTextReasons?.get(path)?.trim();
  if (!target.trim() && !intentionalEmpty) issue('empty');
  if (/\[(?:TODO|TRANSLATE|MISSING)\]/i.test(target)) issue('placeholder');
  if (target !== target.normalize('NFC')) issue('not-nfc');
  if (
    policy.locale !== 'vi' &&
    /[àáâãèéêìíòóôõùúýăđĩũơư\u1ea0-\u1ef9]/iu.test(source) &&
    target === source &&
    !policy.sameTextReasons?.get(path)?.trim()
  )
    issue('untranslated');
  try {
    if (
      JSON.stringify(icuContract(source, 'vi')) !==
      JSON.stringify(icuContract(target, policy.locale))
    ) {
      issue('icu-contract');
    }
  } catch {
    issue('invalid-icu');
  }
  return issues;
}

/** Raw catalog validation, before fallback. Object keys, arrays and invalid leaves stay distinguishable. */
export function catalogIssues(
  source: unknown,
  target: unknown,
  policy: CatalogPolicy,
  path = '',
): CatalogIssue[] {
  const sourceShape = shape(source);
  if (sourceShape === 'invalid') return [{ path, reason: 'invalid-source-shape' }];
  if (sourceShape !== shape(target)) return [{ path, reason: 'shape' }];
  if (typeof source === 'string' && typeof target === 'string') {
    return stringIssues(source, target, path, policy);
  }
  const original = Object.entries(source as object);
  const translated = new Map(Object.entries(target as object));
  const issues: CatalogIssue[] = [];
  for (const [key, value] of original) {
    const child = path ? `${path}.${key}` : key;
    if (!translated.has(key)) issues.push({ path: child, reason: 'missing' });
    else issues.push(...catalogIssues(value, translated.get(key), policy, child));
    translated.delete(key);
  }
  for (const key of translated.keys())
    issues.push({ path: path ? `${path}.${key}` : key, reason: 'extra' });
  return issues;
}

/** Enumerate an expected manifest, not the folders that happen to exist. */
export function catalogFilesIssues(
  expectedLocales: readonly string[],
  expectedFiles: readonly string[],
  read: (locale: string, file: string) => unknown,
  policy: Omit<CatalogPolicy, 'locale'> = {},
): CatalogIssue[] {
  return expectedLocales.flatMap((locale) =>
    expectedFiles.flatMap((file) => {
      const path = `${locale}/${file}`;
      let source: unknown;
      let target: unknown;
      try {
        source = read('vi', file);
        target = read(locale, file);
      } catch {
        return [{ path, reason: 'missing-or-invalid-file' }];
      }
      return catalogIssues(source, target, { ...policy, locale }, path);
    }),
  );
}
