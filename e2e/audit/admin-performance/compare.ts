import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { locales, routes } from './config';

const size = z.number().int().nonnegative();
const metric = z
  .object({ bytes: size, gzip: size, sha256: z.string().regex(/^[a-f0-9]{64}$/) })
  .strict();
const receiptSchema = z
  .object({
    version: z.enum(['baseline', 'current']),
    source: z.string().regex(/^[a-f0-9]{7,40}$/),
    buildId: z.string().min(1),
    locale: z.enum(locales),
    route: z.enum(routes),
    cache: z.literal(
      'fresh context; CDP cache disabled; service workers blocked; no prior route JS',
    ),
    html: metric,
    flight: metric,
    catalog: metric,
    assets: z.array(
      metric.extend({
        path: z.string().startsWith('/_next/'),
        kind: z.enum(['js', 'css', 'font']),
      }),
    ),
    errors: z.array(z.string()).length(0),
    failures: z.array(z.string()).length(0),
    writes: z.array(z.string()).length(0),
    totals: z
      .object({
        jsBytes: size.positive(),
        jsGzip: size.positive(),
        cssBytes: size,
        cssGzip: size,
        fontBytes: size,
      })
      .strict(),
  })
  .strict();

export function compareJs(before: number, after: number) {
  z.number().finite().positive().parse(before);
  z.number().finite().positive().parse(after);
  const ratio = after / before;
  if (ratio > 1.15)
    throw new Error(`Executable JS exceeds15% original-baseline regression: ${before} -> ${after}`);
  return {
    baselineGzip: before,
    currentGzip: after,
    increasePercent: (ratio - 1) * 100,
    baselineOver250KiB: before > 250 * 1024,
    currentOver250KiB: after > 250 * 1024,
  };
}

function receipt(
  input: string,
  version: 'baseline' | 'current',
  locale: (typeof locales)[number],
  route: (typeof routes)[number],
) {
  const row = receiptSchema.parse(
    JSON.parse(
      readFileSync(resolve(input, `${version}-${locale}-${route.slice(1)}.json`), 'utf8'),
    ) as unknown,
  );
  if (row.version !== version || row.locale !== locale || row.route !== route)
    throw new Error('Mismatched receipt identity');
  if (new Set(row.assets.map((a) => a.path)).size !== row.assets.length)
    throw new Error('Duplicate resource receipts');
  for (const [kind, bytesKey, gzipKey] of [
    ['js', 'jsBytes', 'jsGzip'],
    ['css', 'cssBytes', 'cssGzip'],
  ] as const) {
    const assets = row.assets.filter((a) => a.kind === kind);
    if (
      assets.reduce((n, a) => n + a.bytes, 0) !== row.totals[bytesKey] ||
      assets.reduce((n, a) => n + a.gzip, 0) !== row.totals[gzipKey]
    )
      throw new Error('Raw resource sums do not match totals');
  }
  const fonts = row.assets.filter((a) => a.kind === 'font');
  if (fonts.reduce((n, a) => n + a.bytes, 0) !== row.totals.fontBytes)
    throw new Error('Invalid font byte sum');
  if (version === 'current') {
    const expected =
      locale === 'th' ? ['NotoSans-Regular.', 'NotoSansThai-Regular.'] : ['NotoSans-Regular.'];
    if (
      fonts.length !== expected.length ||
      !expected.every((name) => fonts.some((f) => f.path.includes(name)))
    )
      throw new Error('Expected only selected script fonts');
  }
  return row;
}

export function compareReceipts(input: string) {
  const pairs = locales.flatMap((locale) =>
    routes.map((route) => {
      const baseline = receipt(input, 'baseline', locale, route);
      const current = receipt(input, 'current', locale, route);
      return {
        locale,
        route,
        js: compareJs(baseline.totals.jsGzip, current.totals.jsGzip),
        baseline,
        current,
      };
    }),
  );
  for (const version of ['baseline', 'current'] as const) {
    if (
      new Set(pairs.map((p) => p[version].source)).size !== 1 ||
      new Set(pairs.map((p) => p[version].buildId)).size !== 1
    )
      throw new Error('Mixed source/build receipts');
    for (const locale of locales)
      if (
        new Set(pairs.filter((p) => p.locale === locale).map((p) => p[version].catalog.sha256))
          .size !== 1
      )
        throw new Error('Catalog changed across routes');
  }
  return {
    status: 'PASS' as const,
    method:
      'Cold browser actual response bodies; each resource gzip level6; no previous route assets; HTML/Flight/catalog/fonts separate from external executable JS. Original budget debt retained, not claimed resolved.',
    pairs,
  };
}
