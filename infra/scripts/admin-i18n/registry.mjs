import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadExceptions(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .flatMap((name) => {
      const value = JSON.parse(readFileSync(resolve(directory, name), 'utf8'));
      if (!Array.isArray(value)) throw new Error(`Invalid exception registry: ${name}`);
      return value;
    });
}

/** No regex/file/feature blanket allowlist. Every exception binds exact file, kind and text. */
export function classify(findings, exceptions) {
  const keys = new Map(),
    used = new Set(),
    errors = [];
  const key = (item) =>
    JSON.stringify([
      item.file,
      item.kind,
      item.text,
      item.kind === 'enum-jsx' ? [...(item.values ?? [])].sort() : [],
    ]);
  for (const item of exceptions) {
    if (
      !item ||
      typeof item !== 'object' ||
      typeof item.file !== 'string' ||
      typeof item.kind !== 'string' ||
      typeof item.text !== 'string' ||
      typeof item.reason !== 'string' ||
      !item.reason.trim() ||
      !item.file.startsWith('apps/admin/src/') ||
      /[*?]/.test(item.file) ||
      (item.kind === 'enum-jsx' &&
        (!Array.isArray(item.values) || !item.values.every((value) => typeof value === 'string')))
    ) {
      errors.push({ reason: 'invalid-exception', entry: item });
      continue;
    }
    const id = key(item);
    if (keys.has(id)) errors.push({ reason: 'duplicate-exception', entry: item });
    keys.set(id, item);
  }
  const rows = findings.map((item) => {
    const id = key(item),
      exception = keys.get(id);
    if (exception) used.add(id);
    return {
      ...item,
      disposition: exception ? 'retained-contract' : 'unreviewed',
      ...(exception ? { reason: exception.reason } : {}),
    };
  });
  for (const [id, item] of keys)
    if (!used.has(id)) errors.push({ reason: 'stale-exception', entry: item });
  return { rows, errors, unreviewed: rows.filter((item) => item.disposition === 'unreviewed') };
}
