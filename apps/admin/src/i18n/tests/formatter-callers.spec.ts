import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const TARGETS: Record<string, Record<string, number>> = {
  'stores/model': { storeDate: 2, itemPrice: 3 },
  'needs/model': { needDate: 2 },
  'requests/model': { vnDate: 2, commentTime: 2 },
  'projects/model': { vnDate: 2, formatMoney: 3, infoRows: 3 },
  'investors/model': { money: 3, shortDate: 2, stamp: 2 },
  'marketing/model': { fmtN: 2, vnDateTime: 2, campaignCells: 2, statValues: 2 },
  'reports/model': { fmt: 2, monthLabel: 2 },
  'affiliate/format': { affiliateMoney: 2, affiliateDate: 2, affiliateHistoryDate: 2 },
  'affiliate/model': { affiliateMonthLabel: 2 },
  'affiliate/summary-presentation': { affiliateCostRatio: 3, affiliatePayoutCalendar: 2 },
  'events/model': { formatCount: 2 },
  'events/presentation': { eventDay: 3, eventTime: 2 },
  'groups/model': { formatCount: 2 },
  'settings/model': { vnd: 2 },
};

function hasLiveBinding(node: ts.Node, name: string): boolean {
  let parent = node.parent;
  while (parent) {
    if (ts.isFunctionDeclaration(parent) && parent.body) {
      if (
        parent.body.statements.some(
          (statement) =>
            ts.isVariableStatement(statement) &&
            statement.declarationList.declarations.some(
              (declaration) =>
                ts.isIdentifier(declaration.name) &&
                declaration.name.text === name &&
                declaration.initializer &&
                ts.isCallExpression(declaration.initializer) &&
                ts.isIdentifier(declaration.initializer.expression) &&
                declaration.initializer.expression.text === 'useLocale',
            ),
        )
      )
        return true;
    }
    parent = parent.parent;
  }
  return false;
}

function inspect(text: string, file: string) {
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const imports = new Map<string, { arity: number; domain: string }>();
  for (const node of ast.statements) {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) continue;
    const resolvedModule = resolve(dirname(file), node.moduleSpecifier.text).replaceAll('\\', '/');
    const domain = Object.keys(TARGETS).find((key) => resolvedModule.endsWith(`/features/${key}`));
    const names = node.importClause?.namedBindings;
    if (!domain || !names || !ts.isNamedImports(names)) continue;
    for (const name of names.elements) {
      const arity = TARGETS[domain]?.[name.propertyName?.text ?? name.name.text];
      if (arity) imports.set(name.name.text, { arity, domain });
    }
  }
  const usages: { file: string; line: number; domain: string; live: boolean }[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const target = imports.get(node.expression.text);
      if (target) {
        const locale = node.arguments[target.arity - 1];
        usages.push({
          file,
          domain: target.domain,
          line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1,
          live: !!locale && ts.isIdentifier(locale) && hasLiveBinding(node, locale.text),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return usages;
}

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name);
    return entry.isDirectory()
      ? files(file)
      : /\.(ts|tsx)$/.test(file) &&
          !/\.(spec|test)\./.test(file) &&
          /[/\\](components|hooks)[/\\]/.test(file)
        ? [file]
        : [];
  });
}

function fixedDisplays(text: string, file: string) {
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: { file: string; owner: string }[] = [];
  const visit = (node: ts.Node) => {
    const dateMethod =
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString'].includes(
        node.expression.name.text,
      );
    const intl =
      ts.isNewExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(ast) === 'Intl' &&
      ['DateTimeFormat', 'NumberFormat'].includes(node.expression.name.text);
    if (dateMethod || intl) {
      const locale = node.arguments?.[0];
      if (locale && ts.isStringLiteral(locale) && locale.text === 'vi-VN') {
        let parent = node.parent;
        let owner = '';
        while (parent) {
          if (ts.isFunctionDeclaration(parent) && parent.name) {
            owner = parent.name.text;
            break;
          }
          if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
            owner = parent.name.text;
            break;
          }
          parent = parent.parent;
        }
        found.push({ file, owner });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return found;
}

function productionFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name);
    if (['tests', 'mocks', '__tests__'].includes(entry.name)) return [];
    return entry.isDirectory()
      ? productionFiles(file)
      : /\.(ts|tsx)$/.test(file) && !/\.(spec|test)\./.test(file)
        ? [file]
        : [];
  });
}

describe('D-141 AC824-08 model display callers use live locale rather than default vi', () => {
  it('retains a single exact fixed-vi export exception; no fixed-vi visible Intl remains', () => {
    const root = join(__dirname, '../../features');
    const actual = productionFiles(root).flatMap((file) =>
      fixedDisplays(readFileSync(file, 'utf8'), file.slice(root.length + 1).replaceAll('\\', '/')),
    );
    // CSV/Excel cells and filename are an immutable existing contract, NOT UI formatting.
    expect(actual).toEqual([{ file: 'groups/model.ts', owner: 'vnDate' }]);
  });

  it.each([
    "function Example(){return new Intl.NumberFormat('vi-VN').format(n)}",
    "function Example(){return new Intl.DateTimeFormat('vi-VN').format(d)}",
    "function Example(){return d.toLocaleString('vi-VN')}",
  ])('detects a newly hardcoded visible formatter: %s', (source) => {
    expect(fixedDisplays(source, 'fixture.tsx')).toEqual([
      { file: 'fixture.tsx', owner: 'Example' },
    ]);
  });

  it('checks actual imports and every migrated UI caller, not comments or folder presence', () => {
    const actual = files(join(__dirname, '../../features')).flatMap((file) =>
      inspect(readFileSync(file, 'utf8'), file),
    );
    expect(actual.length).toBeGreaterThan(80);
    expect(new Set(actual.map((usage) => usage.domain))).toEqual(
      new Set([
        'stores/model',
        'needs/model',
        'requests/model',
        'projects/model',
        'investors/model',
        'marketing/model',
        'reports/model',
        'affiliate/format',
        'affiliate/model',
        'affiliate/summary-presentation',
        'events/model',
        'events/presentation',
        'groups/model',
        'settings/model',
      ]),
    );
    expect(actual.filter((usage) => !usage.live)).toEqual([]);
  });

  it.each([
    'const locale = useLocale(); return money(1234);',
    "const locale = useLocale(); return money(1234, 'VND', 'vi');",
    "const locale = 'en'; return money(1234, 'VND', locale);",
  ])('detects missing or non-live locale: %s', (body) => {
    expect(
      inspect(
        `import {money} from '../model'; function Example(){${body}}`,
        '/features/investors/components/fixture.tsx',
      ),
    ).toMatchObject([{ live: false }]);
  });

  it('tracks aliases and callbacks closing over the live component locale', () => {
    const source =
      "import {money as display} from '../model'; function Example(){const current = useLocale(); return rows.map(r=>display(r.amount, r.currency, current));}";
    expect(inspect(source, '/features/investors/components/fixture.tsx')).toMatchObject([
      { live: true },
    ]);
    expect(
      inspect(
        '// money(1234)\nconst X = () => money(1234);',
        '/features/investors/components/fixture.tsx',
      ),
    ).toEqual([]);
  });
});
