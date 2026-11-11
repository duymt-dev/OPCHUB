import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '../..');
const locales = ['km', 'lo', 'my'];
function inspect(file, source) {
  const tags = [];
  for (const locale of locales) {
    const json = JSON.stringify({ locale }).slice(1, -1);
    const escaped = JSON.stringify(json).slice(1, -1);
    if (
      source.includes('intervalFormatTemplates') &&
      (source.includes(json) || source.includes(escaped))
    )
      tags.push(`${locale}-date`);
    if (
      source.includes('minimumGroupingDigits') &&
      source.includes(`locale:${JSON.stringify(locale)}`)
    )
      tags.push(`${locale}-number`);
  }
  if (!tags.length) return undefined;
  return { file, tags, locales: [...new Set(tags.map((tag) => tag.split('-')[0]))] };
}

function classify(files, complete) {
  const assets = files.map(({ file, source }) => inspect(file, source)).filter(Boolean);
  const errors = assets
    .filter((asset) => asset.locales.length !== 1)
    .map((asset) => `mixed locale payload: ${asset.file}`);
  if (complete)
    for (const locale of locales)
      for (const kind of ['date', 'number']) {
        const tag = `${locale}-${kind}`;
        if (assets.filter((asset) => asset.tags.includes(tag)).length !== 1)
          errors.push(`missing/duplicate payload: ${tag}`);
      }
  return { assets, errors };
}

if (process.argv.includes('--fixture')) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  if (
    !Array.isArray(input.files) ||
    !input.files.every(
      (file) => file && typeof file.file === 'string' && typeof file.source === 'string',
    )
  )
    throw new Error('Invalid chunk fixture');
  const result = classify(input.files, input.complete === true);
  process.stdout.write(JSON.stringify(result) + '\n');
} else {
  const source = {
    gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    dirty: !!execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim(),
  };
  const builds = {};
  for (const [mode, dist] of [
    ['msw', '.next-msw-tip824'],
    ['server', '.next-server-tip824'],
  ]) {
    const directory = resolve(root, 'apps/admin', dist, 'static/chunks');
    const files = readdirSync(directory, { recursive: true })
      .filter((file) => file.endsWith('.js'))
      .map((file) => ({
        file: file.replaceAll('\\', '/'),
        source: readFileSync(resolve(directory, file), 'utf8'),
      }));
    const result = classify(files, true);
    if (result.errors.length) throw new Error(`${mode}: ${result.errors.join('; ')}`);
    builds[mode] = {
      buildId: readFileSync(resolve(root, 'apps/admin', dist, 'BUILD_ID'), 'utf8').trim(),
      assets: result.assets.map((asset) => {
        const bytes = readFileSync(resolve(directory, asset.file));
        return {
          ...asset,
          path: `/_next/static/chunks/${asset.file}`,
          bytes: bytes.length,
          gzip: gzipSync(bytes).length,
          sha256: createHash('sha256').update(bytes).digest('hex'),
        };
      }),
    };
  }
  const report = {
    scope:
      'Actual locale-data payload isolation only; NOT original-baseline/per-route JS budget acceptance',
    source,
    builds,
  };
  writeFileSync(
    resolve(root, 'coding-packs/reports/evidence/v46-824/intl-chunks.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  process.stdout.write(
    JSON.stringify({
      msw: builds.msw.assets.length,
      server: builds.server.assets.length,
      scope: report.scope,
    }) + '\n',
  );
}
