import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { productionProgram, fixtureProgram, pathOf } from './admin-i18n/source-files.mjs';
import { literalFindings } from './admin-i18n/literals.mjs';
import { numericFindings } from './admin-i18n/numeric.mjs';
import { loadExceptions, classify } from './admin-i18n/registry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const started = performance.now();
function sourceVersion(files) {
  const directory = resolve(root, 'infra/scripts/admin-i18n');
  const exceptionDirectory = resolve(directory, 'exceptions');
  const paths = [
    ...files,
    resolve(root, 'infra/scripts/audit-admin-i18n.mjs'),
    ...readdirSync(directory)
      .filter((name) => name.endsWith('.mjs'))
      .map((name) => resolve(directory, name)),
    ...(existsSync(exceptionDirectory)
      ? readdirSync(exceptionDirectory)
          .filter((name) => name.endsWith('.json'))
          .map((name) => resolve(exceptionDirectory, name))
      : []),
  ].sort();
  const hash = createHash('sha256');
  for (const file of paths)
    hash.update(pathOf(root, file)).update('\0').update(readFileSync(file)).update('\0');
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  return {
    gitHead: git('rev-parse', 'HEAD'),
    dirty: Boolean(
      git(
        'status',
        '--porcelain',
        '--',
        'apps/admin/src',
        'infra/scripts/admin-i18n',
        'infra/scripts/audit-admin-i18n.mjs',
      ),
    ),
    corpusSha256: hash.digest('hex'),
    fingerprintFiles: paths.length,
    fingerprintScope:
      'Scanned production source plus audit scripts and exact exception registries; not catalogs or browser evidence',
  };
}
try {
  const fixture = process.argv.includes('--fixture')
    ? JSON.parse(readFileSync(0, 'utf8'))
    : undefined;
  if (fixture && (typeof fixture.source !== 'string' || typeof fixture.file !== 'string'))
    throw new Error('Invalid fixture');
  const context = fixture ? fixtureProgram(fixture.source, fixture.file) : productionProgram(root);
  const findings = context.files.flatMap((file) => {
    const source = context.program.getSourceFile(file);
    if (!source) throw new Error(`Missing source: ${file}`);
    return [
      ...literalFindings(source, context.checker),
      ...numericFindings(source, context.checker),
    ].map((row) => ({ file: fixture ? fixture.file : pathOf(root, file), ...row }));
  });
  const exceptions =
    fixture?.exceptions ?? loadExceptions(resolve(root, 'infra/scripts/admin-i18n/exceptions'));
  const result = classify(findings, exceptions);
  const inventory = process.argv.includes('--inventory');
  const status = inventory
    ? 'INVENTORY_ONLY'
    : result.unreviewed.length || result.errors.length
      ? 'FAIL'
      : 'PASS';
  process.stdout.write(
    JSON.stringify(
      {
        status,
        command: `node infra/scripts/audit-admin-i18n.mjs${fixture ? ' --fixture' : inventory ? ' --inventory' : ''}`,
        ...(fixture ? {} : { source: sourceVersion(context.files) }),
        sourceFiles: context.files.length,
        excluded: [
          'test/spec/declaration files',
          'tests/__tests__/mocks/__mocks__ fixture directories',
        ],
        durationMs: Math.round(performance.now() - started),
        ...result,
      },
      null,
      2,
    ) + '\n',
  );
  if (!inventory && status !== 'PASS') process.exitCode = 1;
} catch (error) {
  process.stderr.write(String(error) + '\n');
  process.exitCode = 2;
}
