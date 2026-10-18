/**
 * Kiểm 3 — Giới hạn zod ≤ giới hạn body. Mỗi route có `@ZodBody(<schema>)`: tính kích thước JSON tối đa
 * zod cho qua (chuỗi maxLength × 1 byte ASCII, mảng maxItems × phần tử) rồi so với:
 *  - body-parser JSON của Express trong Nest (không cấu hình → mặc định 100kb),
 *  - nginx `client_max_body_size` theo location áp cho path đó.
 * Chuỗi/mảng KHÔNG có max nhưng nhận ảnh data URL (ImageRefService chấp nhận tới 2.000.000 ký tự) cũng tính.
 * Chạy: packages/db/node_modules/.bin/tsx apps/server/test/audit/c3-body-limit.audit.ts
 */
import { z } from 'zod';
import * as api from '@opchub/shared/api';
import * as domains from '@opchub/shared/api-domains';
import {
  abs,
  type CheckResult,
  controllerRoutes,
  type Route,
  type Finding,
  grep,
  isMain,
  lines,
  printResult,
  read,
  rel,
  walk,
} from './lib.audit';

const KB = 1024;
const EXPRESS_DEFAULT = 100 * KB;

type Json = { [k: string]: unknown };
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

interface Size {
  bytes: number;
  /** đường dẫn trường không có giới hạn */
  unbounded: string[];
  /** trường lớn nhất */
  top: { path: string; bytes: number }[];
}

/** Kích thước JSON tối đa (ước lượng ASCII) của một JSON Schema */
function maxSize(s: unknown, path: string, acc: Size, defs: Json): number {
  if (!isObj(s)) return 8;
  if (typeof s.$ref === 'string') {
    const key = s.$ref.split('/').pop() ?? '';
    return maxSize(defs[key], path, acc, defs);
  }
  for (const k of ['anyOf', 'oneOf'] as const) {
    const arr = s[k];
    if (Array.isArray(arr)) return Math.max(0, ...arr.map((x) => maxSize(x, path, acc, defs)));
  }
  if (Array.isArray(s.allOf))
    return s.allOf.reduce<number>((n, x) => n + maxSize(x, path, acc, defs), 0);
  const t = s.type;
  if (t === 'string') {
    if (Array.isArray(s.enum)) return 2 + Math.max(...s.enum.map((e) => String(e).length));
    if (typeof s.maxLength === 'number') {
      const b = s.maxLength + 2;
      if (b > 10 * KB) acc.top.push({ path, bytes: b });
      return b;
    }
    acc.unbounded.push(path);
    return 64;
  }
  if (t === 'array') {
    const item = maxSize(s.items, `${path}[]`, acc, defs);
    if (typeof s.maxItems === 'number') {
      const b = 2 + s.maxItems * (item + 1);
      if (b > 10 * KB) acc.top.push({ path: `${path}[${s.maxItems}]`, bytes: b });
      return b;
    }
    acc.unbounded.push(`${path}[]`);
    return item;
  }
  if (t === 'object' || isObj(s.properties)) {
    const props = isObj(s.properties) ? s.properties : {};
    let n = 2;
    for (const [k, v] of Object.entries(props))
      n += k.length + 4 + maxSize(v, path ? `${path}.${k}` : k, acc, defs);
    return n;
  }
  return 24;
}

/** location nginx (snippet backend) → giới hạn; server-level 1m */
function nginxLimits(): { match: (p: string) => boolean; limit: number; where: string }[] {
  const f = abs('infra/nginx/snippets/opchub-backend.conf');
  const ls = lines(f);
  const toBytes = (v: string): number => {
    const m = v.match(/^(\d+)([kKmM]?)$/);
    const n = Number(m?.[1] ?? 0);
    const u = (m?.[2] ?? '').toLowerCase();
    return u === 'k' ? n * KB : u === 'm' ? n * KB * KB : n;
  };
  const out: { match: (p: string) => boolean; limit: number; where: string }[] = [];
  let serverLimit = KB * KB;
  let serverWhere = '';
  let loc: { kind: string; arg: string; line: number } | null = null;
  ls.forEach((l, i) => {
    const lm = l.match(/^\s*location\s+(=|~|\^~)?\s*(\S+)\s*\{/);
    if (lm) loc = { kind: lm[1] ?? '', arg: lm[2] ?? '', line: i + 1 };
    const cm = l.match(/client_max_body_size\s+(\S+);/);
    if (cm) {
      const lim = toBytes(cm[1] ?? '');
      const where = `${rel(f)}:${i + 1}`;
      if (!loc) {
        serverLimit = lim;
        serverWhere = where;
      } else {
        const { kind, arg } = loc;
        const match =
          kind === '='
            ? (p: string) => p === arg
            : kind === '~'
              ? (p: string) => new RegExp(arg).test(p)
              : (p: string) => p.startsWith(arg);
        out.push({ match, limit: lim, where });
      }
    }
    if (/^\}/.test(l)) loc = null;
  });
  out.push({ match: () => true, limit: serverLimit, where: serverWhere });
  return out;
}

/** Từ dòng @Get/@Post… tới hết chữ ký handler (dừng ở `{` mở thân hoặc route kế) */
function bodyWindow(r: { file: string; line: number }): string {
  const ln = lines(abs(r.file));
  const buf: string[] = [];
  for (let i = r.line; i < ln.length && i < r.line + 20; i++) {
    const l = ln[i] ?? '';
    if (/^\s*@(Get|Post|Put|Patch|Delete)\(/.test(l)) break;
    buf.push(l);
    if (/\)\s*(:\s*[^{]+)?\{\s*$/.test(l)) break;
  }
  return buf.join(' ');
}

const fmt = (b: number): string =>
  b >= KB * KB ? `${(b / KB / KB).toFixed(1)}MB` : `${Math.round(b / KB)}kB`;

/** Filter: PayloadTooLargeError (body-parser, `type: 'entity.too.large'`, status 413) có được map không? */
function checkFilter(fail: Finding[]): number {
  const filterFile = abs('apps/server/src/common/filters/http-exception.filter.ts');
  const filter = read(filterFile);
  if (!/entity\.too\.large|413|PayloadTooLarge|\.status\b.*expose/.test(filter)) {
    const ln =
      lines(filterFile).findIndex((l) => /status: 500, body: \{ code: 'INTERNAL'/.test(l)) + 1;
    fail.push({
      where: `${rel(filterFile)}:${ln}`,
      what: 'lỗi body-parser (PayloadTooLargeError 413, cả JSON hỏng 400 `entity.parse.failed`) không phải HttpException → rơi về 500 INTERNAL + log error',
      sev: 'S2',
    });
    return 0;
  }
  return 1;
}

/** Chuỗi/mảng không giới hạn trong body schema — chỉ đếm, không xếp lỗi */
function unboundedNote(routes: readonly Route[], registry: Record<string, unknown>): string {
  const unb = new Set<string>();
  for (const r of routes) {
    const name = bodyWindow(r).match(/@ZodBody\((\w+)\)/)?.[1];
    const schema = name ? registry[name] : undefined;
    if (!(schema instanceof z.ZodType)) continue;
    const js = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as Json;
    const acc: Size = { bytes: 0, unbounded: [], top: [] };
    maxSize(js, '', acc, isObj(js.$defs) ? js.$defs : {});
    for (const u of acc.unbounded) unb.add(`${name}.${u}`);
  }
  return `Trường chuỗi/mảng trong body KHÔNG có .max (chỉ bị chặn bởi giới hạn body): ${unb.size} — ${[...unb].slice(0, 40).join(', ')}${unb.size > 40 ? ', …' : ''}`;
}

export function runC3(): CheckResult {
  const fail: Finding[] = [];
  const notes: string[] = [];
  let pass = 0;
  const registry: Record<string, unknown> = { ...api, ...domains };
  const routes = controllerRoutes();
  const ngx = nginxLimits();

  // Có cấu hình limit body ở bootstrap không?
  const boot = ['apps/server/src/main-api.ts', 'apps/server/src/common/http/bootstrap-http.ts'];
  const custom = grep(boot.map(abs), /useBodyParser|bodyParser|json\(\s*\{\s*limit|limit:/);
  const bodyLimit = custom.length ? NaN : EXPRESS_DEFAULT;
  notes.push(
    custom.length
      ? `Có cấu hình body tại ${custom.map((h) => `${h.file}:${h.line}`).join(', ')} — xem tay`
      : 'main-api.ts / bootstrap-http.ts không cấu hình giới hạn body → Express body-parser JSON mặc định 100kb (rawBody: true không đổi giới hạn)',
  );

  // Trường ảnh nhận data URL qua ImageRefService (2.000.000 ký tự) dù zod không chặn
  const imgMax = Number(
    (
      read(abs('apps/server/src/modules/uploads/image-ref.service.ts')).match(
        /MAX_DATA_URL = ([\d_]+)/,
      )?.[1] ?? '0'
    ).replace(/_/g, ''),
  );
  const DATA_URL_FIELDS: Record<string, string[]> = {
    projectSaveSchema: ['coverUrl', 'team[].avatarUrl'],
  };

  for (const r of routes) {
    const m = bodyWindow(r).match(/@ZodBody\((\w+)\)/);
    if (!m) continue;
    const name = m[1] ?? '';
    const schema = registry[name];
    const where = `${r.file}:${r.line}`;
    if (!(schema instanceof z.ZodType)) {
      notes.push(
        `${where} ${r.method} ${r.path}: schema \`${name}\` không ở @opchub/shared — bỏ qua`,
      );
      continue;
    }
    const js = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as Json;
    const acc: Size = { bytes: 0, unbounded: [], top: [] };
    let bytes = maxSize(js, '', acc, isObj(js.$defs) ? js.$defs : {});
    for (const f of DATA_URL_FIELDS[name] ?? []) {
      const n = f.includes('[]') ? 20 : 1; // team max 20
      bytes += n * imgMax;
      acc.top.push({
        path: `${f} (data URL qua ImageRefService ≤ ${imgMax} ký tự${n > 1 ? ` × ${n}` : ''})`,
        bytes: n * imgMax,
      });
    }
    const nx = ngx.find((x) => x.match(r.path));
    const nginx = nx?.limit ?? KB * KB;
    const eff = Math.min(nginx, Number.isNaN(bodyLimit) ? Infinity : bodyLimit);
    const top = acc.top
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 3)
      .map((t) => `${t.path} ≈${fmt(t.bytes)}`)
      .join(', ');
    if (bytes > eff) {
      const overNginx = bytes > nginx;
      const sev = acc.top.some((t) => /Url|logo|avatar|cover/i.test(t.path)) ? 'S2' : 'S3';
      fail.push({
        where,
        what:
          `${r.method} ${r.path} \`${name}\`: zod cho tới ≈${fmt(bytes)} > body-parser ${fmt(bodyLimit)}` +
          `${overNginx ? ` và > nginx ${fmt(nginx)} (${nx?.where ?? ''})` : ` (nginx ${fmt(nginx)} cho qua)`} — trường lớn: ${top}`,
        sev,
      });
    } else pass++;
  }

  pass += checkFilter(fail);
  notes.push(unboundedNote(routes, registry));

  // Ảnh data URL ở FE: nơi đọc file thành data URL
  const fe = walk('apps', (f) => /[\\/]src[\\/].*\.tsx?$/.test(f) && !/mocks/.test(f));
  for (const h of grep(fe, /readAsDataURL/))
    notes.push(`FE gửi ảnh dạng data URL: ${h.file}:${h.line}`);
  return { id: 3, title: 'Giới hạn zod ≤ giới hạn body', pass, fail, notes };
}

if (isMain('c3-body-limit.audit.ts')) printResult(runC3());
