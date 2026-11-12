import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const CONTROLS = ['DateRangePicker', 'Pagination', 'BulkBar', 'RichTextField', 'Modal'] as const;
type Control = (typeof CONTROLS)[number];
interface ControlUsage {
  control: Control;
  file: string;
  line: number;
  missing: boolean;
}

function usesProperty(node: ts.Node, property: string): boolean {
  if (ts.isPropertyAccessExpression(node) && node.name.text === property) return true;
  return node.getChildren().some((child) => usesProperty(child, property));
}

/** Inspect actual shared imports/JSX, not just text matching a component name in a comment. */
function usages(text: string, file: string): ControlUsage[] {
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const imports = new Map<string, Control>();
  for (const statement of ast.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== '@opchub/ui'
    )
      continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const binding of bindings.elements) {
      const name = binding.propertyName?.text ?? binding.name.text;
      const control = CONTROLS.find((item) => item === name);
      if (control) imports.set(binding.name.text, control);
    }
  }
  const found: ControlUsage[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const control = imports.get(node.tagName.getText(ast));
      if (control) {
        const props = node.attributes.properties;
        const has = (name: string) =>
          props.some((prop) => ts.isJsxAttribute(prop) && prop.name.getText(ast) === name);
        const spread = (name: string) =>
          props.some(
            (prop) => ts.isJsxSpreadAttribute(prop) && usesProperty(prop.expression, name),
          );
        const labeled =
          control === 'DateRangePicker'
            ? spread('dateRange')
            : control === 'Pagination'
              ? props.some(
                  (prop) =>
                    ts.isJsxAttribute(prop) &&
                    prop.name.getText(ast) === 'labels' &&
                    usesProperty(prop, 'pagination'),
                )
              : control === 'RichTextField'
                ? props.some(
                    (prop) =>
                      ts.isJsxAttribute(prop) &&
                      prop.name.getText(ast) === 'labels' &&
                      usesProperty(prop, 'editor'),
                  )
                : control === 'BulkBar'
                  ? spread('bulk') ||
                    ['selectedLabel', 'clearLabel', 'ariaLabel', 'formatCount'].every(has)
                  : has('closeLabel');
        found.push({
          control,
          file,
          line: ast.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          missing: !labeled,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return found;
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(file)
      : file.endsWith('.tsx') && !/\.(spec|test)\.tsx$/.test(file)
        ? [file]
        : [];
  });
}

describe('D-141 AC824-09 shared controls do not inherit Vietnamese defaults in Admin', () => {
  it('every real Admin shared-control caller explicitly supplies localized props', () => {
    const root = join(__dirname, '../../features');
    const actual = sourceFiles(root).flatMap((file) =>
      usages(readFileSync(file, 'utf8'), relative(root, file)),
    );
    expect(actual.length).toBeGreaterThan(40);
    expect(new Set(actual.map((item) => item.control)).size).toBe(CONTROLS.length);
    expect(actual.filter((item) => item.missing)).toEqual([]);
  });

  it.each(CONTROLS)('detects a missing %s label contract in an isolated fixture', (control) => {
    const source = `import { ${control} } from '@opchub/ui'; function Example() { return <${control} />; }`;
    expect(usages(source, 'fixture.tsx')).toMatchObject([{ control, missing: true }]);
  });

  it('resolves imported aliases and ignores unrelated components/comments', () => {
    expect(
      usages(
        "import { Pagination as Pager } from '@opchub/ui'; const X = () => <Pager labels={{...ui.pagination}} />;",
        'fixture.tsx',
      ),
    ).toMatchObject([{ control: 'Pagination', missing: false }]);
    expect(usages('// <Pagination />\nconst X = () => <Pagination />;', 'fixture.tsx')).toEqual([]);
  });
});
