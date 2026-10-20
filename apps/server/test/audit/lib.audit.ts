/**
 * AUDIT-W1 làn A — tiện ích chung cho kiểm cơ học (phân tích tĩnh, không DB).
 * Tên `*.audit.ts` KHÔNG khớp include vitest (`src/**\/*.spec.ts`, `test/**\/*.int.spec.ts`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { methodDecoratorMap } from './controller-decorators.audit';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

export interface Finding {
  where: string;
  what: string;
  /** S1..S4 hoặc NỢ — gợi ý, người đọc quyết */
  sev: string;
}

export interface CheckResult {
  id: number;
  title: string;
  pass: number;
  fail: Finding[];
  notes: string[];
}

export const rel = (abs: string): string => relative(ROOT, abs).split(sep).join('/');
export const abs = (p: string): string => join(ROOT, p);

const SKIP = new Set(['node_modules', '.next', '.next-server', 'dist', 'generated', '.turbo']);

/** Liệt kê file đệ quy (bỏ build/node_modules) */
export function walk(dir: string, accept: (f: string) => boolean): string[] {
  const out: string[] = [];
  const base = abs(dir);
  const stack = [base];
  while (stack.length) {
    const d = stack.pop() ?? '';
    let names: string[] = [];
    try {
      names = readdirSync(d);
    } catch {
      continue;
    }
    for (const n of names) {
      if (SKIP.has(n)) continue;
      const p = join(d, n);
      if (statSync(p).isDirectory()) stack.push(p);
      else if (accept(p)) out.push(p);
    }
  }
  return out.sort();
}

export const isTs = (f: string): boolean => /\.tsx?$/.test(f) && !/\.d\.ts$/.test(f);
export const isProdTs = (f: string): boolean => isTs(f) && !/\.(spec|test)\.tsx?$/.test(f);

export const read = (f: string): string => readFileSync(f, 'utf8');
export const lines = (f: string): string[] => read(f).split(/\r?\n/);

export interface Hit {
  file: string;
  line: number;
  text: string;
  m: RegExpMatchArray;
}

/** Tìm theo dòng trong danh sách file */
export function grep(files: readonly string[], re: RegExp): Hit[] {
  const hits: Hit[] = [];
  for (const f of files) {
    lines(f).forEach((text, i) => {
      const m = text.match(re);
      if (m) hits.push({ file: rel(f), line: i + 1, text: text.trim(), m });
    });
  }
  return hits;
}

export const at = (h: Pick<Hit, 'file' | 'line'>): string => `${h.file}:${h.line}`;

// ---------------- Route controller NestJS ----------------

export interface Route {
  method: string;
  path: string;
  file: string;
  line: number;
  handler: string;
  /** Decorator của method (gom các dòng ngay trên) */
  deco: string[];
  /** Decorator của class */
  classDeco: string[];
}

const join2 = (a: string, b: string): string =>
  ('/' + [a, b].filter(Boolean).join('/')).replace(/\/+/g, '/').replace(/\/$/, '') || '/';

const HTTP_RE = /^\s*@(Get|Post|Put|Patch|Delete)\(\s*(?:'([^']*)')?\s*\)/;

function classInfo(ls: readonly string[]): { prefix: string; deco: string[]; start: number } {
  const ci = ls.findIndex((l) => /^export class /.test(l));
  const deco: string[] = [];
  let prefix = '';
  for (let i = ci - 1; i >= 0 && /^@|^\s*$|^\s*\*|^\/\*\*/.test(ls[i] ?? ''); i--) {
    const l = ls[i] ?? '';
    const c = l.match(/^@Controller\(\s*(?:'([^']*)')?/);
    if (c) prefix = c[1] ?? '';
    if (l.startsWith('@')) deco.push(l.trim());
  }
  return { prefix, deco, start: ci };
}

/** Mọi route REST (đã cộng prefix `/v1` của setGlobalPrefix) */
export function controllerRoutes(): Route[] {
  const files = walk('apps/server/src', (f) => /\.controller\.ts$/.test(f));
  const out: Route[] = [];
  for (const f of files) {
    const ls = lines(f);
    const c = classInfo(ls);
    const decorators = methodDecoratorMap(read(f));
    ls.forEach((l, i) => {
      const m = l.match(HTTP_RE);
      if (!m || i < c.start) return;
      const deco = [...(decorators.get(i + 1) ?? [])];
      let handler = '';
      for (let j = i + 1; j < ls.length && j < i + 8; j++) {
        const h = (ls[j] ?? '').match(/^\s*(?:async\s+)?(\w+)\s*\(/);
        if (h && !(ls[j] ?? '').trim().startsWith('@')) {
          handler = h[1] ?? '';
          break;
        }
      }
      out.push({
        method: (m[1] ?? '').toUpperCase(),
        path: join2('v1', join2(c.prefix, m[2] ?? '')),
        file: rel(f),
        line: i + 1,
        handler,
        deco,
        classDeco: c.deco,
      });
    });
  }
  return out;
}

/** Route Nest `:id` / `*key` → regex khớp đường dẫn cụ thể */
export function routeRegex(path: string): RegExp {
  const body = path
    .split('/')
    .map((s) => {
      if (s.startsWith(':')) return '[^/]+';
      if (s.startsWith('*')) return '.+';
      return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return new RegExp(`^${body}$`);
}

// ---------------- In kết quả ----------------

export const out = (s = ''): void => {
  process.stdout.write(s + '\n');
};

export function printResult(r: CheckResult): void {
  out(`\n=== Kiểm ${r.id}: ${r.title} ===`);
  out(`Đạt: ${r.pass} · Không đạt: ${r.fail.length}`);
  for (const f of r.fail) out(`  [${f.sev}] ${f.where} — ${f.what}`);
  for (const n of r.notes) out(`  · ${n}`);
}

/** File đang chạy trực tiếp (không phải bị import bởi run-all) */
export const isMain = (name: string): boolean =>
  (process.argv[1] ?? '').split(sep).join('/').endsWith(name);
