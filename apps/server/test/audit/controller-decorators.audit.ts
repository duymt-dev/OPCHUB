import * as ts from 'typescript';

const HTTP = new Set(['Get', 'Post', 'Put', 'Patch', 'Delete']);

/** Associate the whole method decorator block, regardless of order or formatting. */
export function methodDecoratorMap(
  source: string | ts.SourceFile,
): ReadonlyMap<number, readonly string[]> {
  const file =
    typeof source === 'string'
      ? ts.createSourceFile('controller.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
      : source;
  const result = new Map<number, readonly string[]>();
  const visit = (node: ts.Node): void => {
    if (ts.isMethodDeclaration(node)) {
      const decorators = ts.getDecorators(node) ?? [];
      const text = decorators.map((d) => d.getText(file));
      for (const decorator of decorators) {
        const call = decorator.expression;
        if (
          !ts.isCallExpression(call) ||
          !ts.isIdentifier(call.expression) ||
          !HTTP.has(call.expression.text)
        )
          continue;
        const line = file.getLineAndCharacterOfPosition(decorator.getStart(file)).line + 1;
        result.set(line, text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return result;
}
