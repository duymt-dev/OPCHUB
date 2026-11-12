import { resolve } from 'node:path';
import { fixtureProgram, pathOf } from './source-files.mjs';
import { literalFindings } from './literals.mjs';
import { numericFindings } from './numeric.mjs';
import { loadExceptions, classify } from './registry.mjs';

/** Shared by the actual CLI and tests; no fixture/program/result cache. */
export function analyzeSourceContext(context, root, fixture) {
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
  return classify(findings, exceptions);
}

export function sourceAuditStatus(result, inventory = false) {
  return inventory
    ? 'INVENTORY_ONLY'
    : result.unreviewed.length || result.errors.length
      ? 'FAIL'
      : 'PASS';
}

export function sourceFixtureContext(root, fixture) {
  if (!fixture || typeof fixture.source !== 'string' || typeof fixture.file !== 'string')
    throw new Error('Invalid fixture');
  // Resolve the same repository-relative file in CLI and test runners with different cwd.
  return fixtureProgram(fixture.source, resolve(root, fixture.file));
}

export function auditSourceFixture(root, fixture) {
  const context = sourceFixtureContext(root, fixture);
  const result = analyzeSourceContext(context, root, fixture);
  return { status: sourceAuditStatus(result), sourceFiles: context.files.length, ...result };
}
