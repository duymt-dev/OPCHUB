import { describe, expect, it } from 'vitest';
import * as ts from 'typescript';
import { methodDecoratorMap } from './controller-decorators.audit';

function only(source: string) {
  const map = methodDecoratorMap(source);
  expect(map.size).toBe(1);
  return [...map.values()][0] ?? [];
}

describe('REQ-312 C5 audit associates real method guards without relying on decorator order', () => {
  it('A14 reuses an already parsed SourceFile without changing decorator associations', () => {
    const source = "class C { @RequireAdmin('affiliate.view') @Post('x') save() {} }";
    const file = ts.createSourceFile('controller.ts', source, ts.ScriptTarget.Latest, true);
    expect(methodDecoratorMap(file)).toEqual(methodDecoratorMap(source));
  });
  it.each([
    "@RequireAdmin('affiliate.view')\n@Get('preview')",
    "@Get('preview')\n@RequireAdmin('affiliate.view')",
  ])('collects the guard before or after HTTP: %s', (block) => {
    expect(only(`class C {\n${block}\npreview() {}\n}`)).toContain(
      "@RequireAdmin('affiliate.view')",
    );
  });

  it('supports comments, blank lines and multiline guard calls', () => {
    const source = `class C {
      @Get('preview')
      // A valid guard may be separated by a comment or line break.

      @RequireAdmin(
        'affiliate.view'
      )
      preview() {}
    }`;
    const decorators = only(source);
    expect(decorators).toHaveLength(2);
    expect(decorators.join('\n')).toContain("'affiliate.view'");
  });

  it('does not borrow a guard from an adjacent method', () => {
    const source = `class C {
      @Get('unguarded')
      unguarded() {}
      @RequireAdmin('affiliate.view')
      guardedSibling() {}
    }`;
    expect(only(source)).toEqual(["@Get('unguarded')"]);
  });

  it('does not turn guard-looking comments or body strings into authorization', () => {
    const source = `class C {
      // @RequireAdmin('affiliate.view')
      @Get('unguarded')
      unguarded() { return "@RequireAdmin('affiliate.view')"; }
    }`;
    expect(only(source)).toEqual(["@Get('unguarded')"]);
  });

  it('keys routes by the actual HTTP decorator line and ignores class guards as method guards', () => {
    const source = `@RequireAdmin('affiliate.view')
class C {
  @Get('preview')
  preview() {}
}`;
    const map = methodDecoratorMap(source);
    expect([...map.keys()]).toEqual([3]);
    expect(map.get(3)).toEqual(["@Get('preview')"]);
  });
});
