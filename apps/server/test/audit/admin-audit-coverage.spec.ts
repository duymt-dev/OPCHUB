import { readdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { methodDecoratorMap } from './controller-decorators.audit';
import { adminAuditManifest, type AdminAuditEntry } from './admin-audit-manifest';

async function sources(dir: string): Promise<{ path: string; text: string }[]> {
  const pending = [dir];
  const paths: string[] = [];
  while (pending.length) {
    const directory = pending.pop();
    if (!directory) continue;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (path.endsWith('.ts') && !path.endsWith('.spec.ts')) paths.push(path);
    }
  }
  const result: { path: string; text: string }[] = [];
  // Bound open file handles even on Windows and read every source exactly once.
  for (let offset = 0; offset < paths.length; offset += 8) {
    result.push(
      ...(await Promise.all(
        paths.slice(offset, offset + 8).map(async (path) => ({
          path,
          text: await readFile(path, 'utf8'),
        })),
      )),
    );
  }
  return result;
}

/** Flat controllers and class-level Admin decorators count as well as /controllers/. */
export function adminWriteRoutes(source: string): string[] {
  const file = ts.createSourceFile('controller.ts', source, ts.ScriptTarget.Latest, true);
  const decorators = methodDecoratorMap(file),
    result: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isMethodDeclaration(node) && ts.isClassDeclaration(node.parent)) {
      const own = ts.getDecorators(node) ?? [];
      const classText = (ts.getDecorators(node.parent) ?? []).map((d) => d.getText(file));
      for (const decorator of own) {
        const text = decorator.getText(file);
        if (!/^@(Post|Put|Patch|Delete)\(/.test(text)) continue;
        const line = file.getLineAndCharacterOfPosition(decorator.getStart(file)).line + 1;
        const all = [...(decorators.get(line) ?? []), ...classText];
        if (all.some((d) => /^@Require(Any)?Admin\(/.test(d)))
          result.push(`${node.parent.name?.text ?? ''}.${node.name.getText(file)}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return result;
}

function gaps(
  routes: string[],
  manifest: Readonly<Record<string, AdminAuditEntry>>,
  source: string,
) {
  const missing = routes.filter((r) => !manifest[r]);
  const stale = Object.keys(manifest).filter((r) => !routes.includes(r));
  const actions = Object.entries(manifest).flatMap(([route, entry]) => {
    if (typeof entry === 'object' && !Array.isArray(entry) && 'exempt' in entry)
      return entry.exempt.trim() ? [] : [route];
    return (typeof entry === 'string' ? [entry] : (entry as readonly string[]))
      .filter((action) => !source.includes(action))
      .map((action) => `${route}: ${action}`);
  });
  return { missing, stale, actions };
}

describe('REQ-624 BR-485 Admin audit manifest', () => {
  it('covers every Admin write route and references actual production action expressions', async () => {
    const all = await sources(resolve('src'));
    const routes = all
      .filter((p) => p.path.endsWith('.controller.ts'))
      .flatMap((p) => adminWriteRoutes(p.text));
    expect(routes.length).toBeGreaterThan(100);
    const source = all.map((p) => p.text).join('\n');
    expect(gaps(routes, adminAuditManifest, source)).toEqual({
      missing: [],
      stale: [],
      actions: [],
    });
  });
  it('rejects a new fake route, stale manifest and nonexistent action; decorator order cannot bypass it', () => {
    const routes = adminWriteRoutes(`@RequireAdmin('settings.log') class Fake {
      @Post('x') save() {} @RequireAnyAdmin('settings.general') @Patch('y') edit() {}
      @Get('read') read() {}
    }`);
    expect(routes).toEqual(['Fake.save', 'Fake.edit']);
    expect(
      gaps(
        routes,
        { 'Fake.save': 'missing.action', 'Old.save': { exempt: 'Read-only preview' } },
        '',
      ),
    ).toEqual({
      missing: ['Fake.edit'],
      stale: ['Old.save'],
      actions: ['Fake.save: missing.action'],
    });
  });
});
