import ts from 'typescript';

/** Test-only import lexer: scan all source bytes without allocating unrelated TSX AST nodes. */
export function importSpecifiers(source: string): string[] {
  return ts.preProcessFile(source, true, true).importedFiles.map((file) => file.fileName);
}
