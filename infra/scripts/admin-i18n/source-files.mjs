import { readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import ts from 'typescript';

export const slash = (value) => value.replaceAll('\\', '/');
export const pathOf = (root, file) => slash(relative(root, file));

export function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const file = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        return ['tests', '__tests__', 'mocks', '__mocks__'].includes(entry.name)
          ? []
          : sourceFiles(file);
      }
      return /\.(ts|tsx)$/.test(file) && !/\.(spec|test|d)\.ts[x]?$/.test(file) ? [file] : [];
    })
    .sort();
}

export function productionProgram(root) {
  const files = sourceFiles(resolve(root, 'apps/admin/src'));
  const config = ts.getParsedCommandLineOfConfigFile(
    resolve(root, 'apps/admin/tsconfig.json'),
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
      },
    },
  );
  if (!config || config.errors.length) throw new Error('Invalid Admin TypeScript config');
  const roots = [...files, ...config.fileNames.filter((file) => file.endsWith('.d.ts'))];
  const program = ts.createProgram(
    roots,
    config.options,
    ts.createCompilerHost(config.options, true),
  );
  const errors = [...program.getSyntacticDiagnostics(), ...program.getSemanticDiagnostics()];
  if (errors.length)
    throw new Error(
      'Invalid production types: ' +
        errors
          .slice(0, 5)
          .map((error) => ts.flattenDiagnosticMessageText(error.messageText, '\n'))
          .join('; '),
    );
  return { program, files, checker: program.getTypeChecker() };
}

export function fixtureProgram(code, name = 'fixture.tsx') {
  const file = resolve(name);
  const options = {
    strict: true,
    noEmit: true,
    jsx: ts.JsxEmit.Preserve,
    target: ts.ScriptTarget.ESNext,
  };
  const host = ts.createCompilerHost(options, true);
  const original = host.getSourceFile.bind(host);
  host.getSourceFile = (path, ...args) =>
    resolve(path) === file
      ? ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      : original(path, ...args);
  const program = ts.createProgram([file], options, host);
  return { program, files: [file], checker: program.getTypeChecker() };
}

export function children(source, visit) {
  const walk = (node) => {
    visit(node);
    ts.forEachChild(node, walk);
  };
  walk(source);
}

export function finding(source, node, kind, text, extra = {}) {
  return {
    kind,
    line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
    text: text ?? node.getText(source),
    start: node.getStart(source),
    end: node.getEnd(),
    ...extra,
  };
}

/** Same literal may be used twice in one file; retain each occurrence/line in evidence. */
export function unique(findings) {
  const seen = new Set();
  return findings.filter((row) => {
    const key = JSON.stringify([row.kind, row.start, row.end, row.text]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
