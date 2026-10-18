/**
 * Kiểm 6 — Env zod → .env.example. Đọc khoá từ các zod env schema (server, portal, admin, next.config,
 * seed db) và so hai chiều với `.env.example` tương ứng + `infra/env/*.env.example` (bản production).
 * Chỉ đọc TÊN khoá, không in giá trị. Không đọc `.env` thật hay D:\opchub-local.
 * Chạy: packages/db/node_modules/.bin/tsx apps/server/test/audit/c6-env.audit.ts
 */
import { existsSync } from 'node:fs';
import { abs, type CheckResult, type Finding, isMain, lines, printResult, read } from './lib.audit';

/** Khoá trong `z.object({ KEY: … })` của file (chỉ dòng `  KEY:` viết hoa) */
function schemaKeys(file: string, filter?: RegExp): Map<string, number> {
  const m = new Map<string, number>();
  lines(abs(file)).forEach((l, i) => {
    const k = l.match(/^\s+([A-Z][A-Z0-9_]+):\s*(z\.|z$|csv\b|bool\b)/)?.[1];
    if (k && (!filter || filter.test(k))) m.set(k, i + 1);
  });
  return m;
}

/** Khoá trong env example — cả dòng comment `# KEY=` (coi là có tài liệu) */
function exampleKeys(file: string): Map<string, { line: number; commented: boolean }> {
  const m = new Map<string, { line: number; commented: boolean }>();
  if (!existsSync(abs(file))) return m;
  lines(abs(file)).forEach((l, i) => {
    const r = l.match(/^\s*(#\s*)?([A-Z][A-Z0-9_]+)=/);
    if (r?.[2]) m.set(r[2], { line: i + 1, commented: Boolean(r[1]) });
  });
  return m;
}

/** `process.env.X` thô trong file (ngoài schema) */
function rawEnv(file: string): Map<string, number> {
  const m = new Map<string, number>();
  lines(abs(file)).forEach((l, i) => {
    for (const r of l.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g))
      if (r[1] && !m.has(r[1])) m.set(r[1], i + 1);
  });
  return m;
}

/** Biến shell `${X}` / `$X` script infra dùng */
function shellVars(file: string): Set<string> {
  const s = new Set<string>();
  for (const r of read(abs(file)).matchAll(/\$\{?([A-Z][A-Z0-9_]{2,})/g)) if (r[1]) s.add(r[1]);
  return s;
}

interface Pair {
  name: string;
  schema: Map<string, string>;
  example: string;
  /** khoá được đặt ở chỗ khác (systemd Environment=, deploy.sh) — không đòi trong example */
  setElsewhere?: Record<string, string>;
  /** chỉ kiểm chiều schema → example */
  oneWay?: boolean;
}

const tag = (file: string, m: Map<string, number>): Map<string, string> =>
  new Map([...m].map(([k, l]) => [k, `${file}:${l}`]));

function buildPairs(): { pairs: Pair[]; srv: Map<string, string> } {
  const srv = tag(
    'apps/server/src/common/config/env.schema.ts',
    schemaKeys('apps/server/src/common/config/env.schema.ts'),
  );
  const portal = tag('apps/portal/src/lib/env.ts', schemaKeys('apps/portal/src/lib/env.ts'));
  const admin = tag('apps/admin/src/lib/env.ts', schemaKeys('apps/admin/src/lib/env.ts'));
  const nextP = tag('apps/portal/next.config.ts', schemaKeys('apps/portal/next.config.ts'));
  const nextA = tag('apps/admin/next.config.ts', schemaKeys('apps/admin/next.config.ts'));
  const db = new Map<string, string>();
  for (const f of [
    'packages/db/seed/index.ts',
    'packages/db/seed/demo.ts',
    'packages/db/seed/load.ts',
  ]) {
    for (const [k, v] of tag(f, schemaKeys(f))) if (!db.has(k)) db.set(k, v);
  }
  for (const [k, v] of tag('packages/db/test/env.ts', schemaKeys('packages/db/test/env.ts')))
    if (!db.has(k)) db.set(k, v);
  for (const f of ['packages/db/prisma.config.ts', 'packages/db/scripts/migrate-test.mjs']) {
    if (!existsSync(abs(f))) continue;
    for (const [k, v] of tag(f, rawEnv(f))) if (!db.has(k) && !srv.has(k)) db.set(k, v);
  }

  const pairs: Pair[] = [
    { name: 'server (dev)', schema: srv, example: 'apps/server/.env.example' },
    {
      name: 'server (prod)',
      schema: srv,
      example: 'infra/env/server.env.example',
      setElsewhere: {
        API_PORT: 'systemd opchub-api@ Environment=',
        SOCKET_PORT: 'systemd opchub-socket@ Environment=',
        DIRECT_URL: 'deploy.sh (migrate)',
      },
    },
    {
      name: 'portal (dev)',
      schema: new Map([...portal, ...nextP]),
      example: 'apps/portal/.env.example',
    },
    { name: 'portal (prod)', schema: portal, example: 'infra/env/portal.env.example' },
    {
      name: 'admin (dev)',
      schema: new Map([...admin, ...nextA]),
      example: 'apps/admin/.env.example',
    },
    { name: 'admin (prod)', schema: admin, example: 'infra/env/admin.env.example' },
    { name: 'db (seed/migrate/test)', schema: db, example: 'packages/db/.env.example' },
  ];
  return { pairs, srv };
}

export function runC6(): CheckResult {
  const fail: Finding[] = [];
  const notes: string[] = [];
  let pass = 0;
  const { pairs, srv } = buildPairs();
  // Khoá chỉ dùng ở test int server (đọc .env của apps/server) — dev example nên có
  const serverTest = tag('apps/server/test/setup/env.ts', rawEnv('apps/server/test/setup/env.ts'));

  for (const p of pairs) {
    const ex = exampleKeys(p.example);
    if (!ex.size) {
      fail.push({ where: p.example, what: `${p.name}: thiếu file .env.example`, sev: 'S3' });
      continue;
    }
    for (const [k, where] of p.schema) {
      if (ex.has(k) || p.setElsewhere?.[k]) {
        pass++;
        continue;
      }
      const prod = p.example.startsWith('infra/');
      const sev = 'S4';
      let extra = '';
      if (prod && k === 'STORAGE_PROVIDER') extra = ' (mặc định s3 — đúng cho production)';
      if (prod && k === 'RATE_LIMIT_DISABLED')
        extra = ' (mặc định false — đúng, chỉ là thiếu tài liệu)';
      if (prod && k === 'NEXT_PUBLIC_SOCKET_URL') extra = ' (trống = cùng origin)';
      fail.push({
        where,
        what: `${p.name}: \`${k}\` có trong schema nhưng không có trong ${p.example}${extra}`,
        sev,
      });
    }
    if (p.oneWay) continue;
    for (const [k, v] of ex) {
      if (p.schema.has(k) || p.setElsewhere?.[k]) continue;
      const isTest = p.name === 'server (dev)' && serverTest.has(k);
      const devOnly = ['API_PROXY_URL', 'NEXT_DIST_DIR'].includes(k);
      if (isTest || devOnly) continue;
      const sentry = k === 'SENTRY_DSN';
      fail.push({
        where: `${p.example}:${v.line}`,
        what: `${p.name}: \`${k}\` có trong example nhưng không schema nào đọc${sentry ? ' (giữ chỗ Q-B65-1, chưa tích hợp)' : ''}`,
        sev: 'S4',
      });
    }
  }
  // server test keys trong dev example
  const srvEx = exampleKeys('apps/server/.env.example');
  for (const [k, where] of serverTest) {
    if (
      srv.has(k) ||
      ['NODE_ENV', 'DATABASE_URL', 'REDIS_DB', 'LOG_LEVEL', 'CORS_ORIGINS'].includes(k)
    )
      continue;
    if (srvEx.has(k)) pass++;
    else
      fail.push({
        where,
        what: `test int server đọc \`${k}\` nhưng apps/server/.env.example không có`,
        sev: 'S4',
      });
  }

  pass += checkInfraScripts(fail);
  notes.push(
    'Root `.env.example` không tồn tại — mỗi app/package có file riêng (không tính là lỗi)',
  );
  return { id: 6, title: 'Env zod → .env.example', pass, fail, notes };
}

/** infra env khác: backup / health — so với biến script dùng */
function checkInfraScripts(fail: Finding[]): number {
  let pass = 0;
  const infra: { example: string; script: string }[] = [
    { example: 'infra/env/backup.env.example', script: 'infra/backup/pg-backup.sh' },
    { example: 'infra/env/health.env.example', script: 'infra/monitoring/healthcheck.sh' },
  ];
  for (const x of infra) {
    const ex = exampleKeys(x.example);
    const used = shellVars(x.script);
    for (const [k, v] of ex) {
      if (used.has(k) || ['PGDATABASE', 'RCLONE_CONFIG'].includes(k)) pass++;
      else
        fail.push({
          where: `${x.example}:${v.line}`,
          what: `\`${k}\` không được ${x.script} dùng`,
          sev: 'S4',
        });
    }
  }
  return pass;
}

if (isMain('c6-env.audit.ts')) printResult(runC6());
