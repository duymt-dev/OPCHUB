import { expect, it } from 'vitest';
import ts from 'typescript';
import { importSpecifiers } from './import-contract';

const raw = '@/lib/upload-image';
const declarations = [
  "import { uploadImage as renamed } from '@/lib/upload-image';",
  "import * as renamed from '@/lib/upload-image';",
  "import renamed from '@/lib/upload-image';",
  "import type { UploadKind } from '@/lib/upload-image';",
  "import '@/lib/upload-image';",
  "import { renamed } from '@\\u002flib/upload-image';",
];
it.each(declarations)('D-141 AC824-10 import scan matches full AST for %s', (source) => {
  const tree = ts.createSourceFile(
    'fixture.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const oracle = tree.statements.flatMap((node) =>
    ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)
      ? [node.moduleSpecifier.text]
      : [],
  );
  expect(oracle).toEqual([raw]);
  expect(importSpecifiers(source)).toEqual(oracle);
});
it.each([
  "// import { uploadImage } from '@/lib/upload-image';",
  "/* import { uploadImage } from '@/lib/upload-image'; */",
  'const text = "import fake from \'@/lib/upload-image\'";',
])('D-141 AC824-10 import scan ignores non-import source %s', (source) => {
  expect(importSpecifiers(source)).toEqual([]);
});
it('D-141 AC824-10 import scan additionally catches re-export and literal dynamic import', () => {
  expect(importSpecifiers("export { uploadImage } from '@/lib/upload-image';")).toContain(raw);
  expect(importSpecifiers("const code = import('@/lib/upload-image');")).toContain(raw);
});
