import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const target = process.argv[2] ?? 'opchub_v46_814_chain_test';
if (target !== 'opchub_v46_814_chain_test' || !target.includes('_chain_test')) {
  throw new Error('Refusing database outside the explicitly approved _chain_test target');
}
const source = new URL(process.env.DIRECT_URL ?? '');
if (!['localhost', '127.0.0.1'].includes(source.hostname)) {
  throw new Error('Migration chain check requires approved loopback PostgreSQL');
}
const cwd = fileURLToPath(new URL('..', import.meta.url));
const migrations = resolve(cwd, 'prisma/migrations');
const names = readdirSync(migrations, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const rollback = names.filter((name) => name >= '20261104090000' && /_v46_/.test(name));
if (rollback.length !== 16) throw new Error('Expected15 historical v46 migrations plus B12');
for (const name of rollback) readFileSync(resolve(migrations, name, 'down.sql'), 'utf8');

const connection = (database) => ({
  ...process.env,
  PGHOST: source.hostname,
  PGPORT: source.port || '5432',
  PGUSER: decodeURIComponent(source.username),
  PGPASSWORD: decodeURIComponent(source.password),
  PGDATABASE: database,
});
function execute(command, args, env, input) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    input,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    // No URL/credential arguments are used by psql/pg_dump.
    process.stderr.write(result.stderr ?? '');
    process.stderr.write(result.stdout ?? '');
    throw new Error(`${command} exited ${result.status}`);
  }
  return result.stdout;
}
const sql = (database, statement) =>
  execute('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-At'], connection(database), statement);
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
const prismaUrl = new URL(source);
prismaUrl.pathname = `/${target}`;
function deploy() {
  const output = execute(
    process.execPath,
    [resolve(cwd, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'],
    {
      ...connection(target),
      DIRECT_URL: prismaUrl.href,
      DATABASE_URL: prismaUrl.href,
    },
  );
  process.stdout.write(output);
  const count = Number(
    sql(
      target,
      'SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;',
    ).trim(),
  );
  if (count !== names.length) throw new Error(`Applied ${count}, expected ${names.length}`);
  process.stdout.write(`Verified ${count} applied migrations\n`);
}
function schema() {
  return execute('pg_dump', ['--schema-only', '--no-owner'], connection(target))
    .replace(/^\\(?:un)?restrict .*\r?\n/gm, '')
    .replace(/\r\n/g, '\n');
}

/** Owner-approved white-DB-only exception: historical downs deliberately retain enum labels.
 * Keep applied migration files immutable; restore their pre-v46 enum boundary for replay.
 */
function restoreRetainedEnums() {
  if (sql(target, 'SELECT current_database();').trim() !== 'opchub_v46_814_chain_test') {
    throw new Error('Refusing enum restoration outside owned chain database');
  }
  for (const [type, table, column, removed] of [
    ['mail_kind', 'mail_logs', 'kind', 'regional_director'],
    ['membership_fee_status', 'membership_fees', 'status', 'regional_director'],
    ['payment_match_status', 'payment_transactions', 'match_status', 'short'],
  ]) {
    const json = (query) => JSON.parse(sql(target, query).trim());
    const labels = json(`SELECT json_agg(enumlabel ORDER BY enumsortorder) FROM pg_enum
      WHERE enumtypid=${quote(type)}::regtype AND enumlabel<>${quote(removed)};`);
    const indexes =
      json(`SELECT coalesce(json_agg(json_build_object('name',c.relname,'def',pg_get_indexdef(i.indexrelid))), '[]'::json)
      FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
      WHERE i.indrelid=${quote(table)}::regclass
      AND NOT EXISTS(SELECT 1 FROM pg_constraint k WHERE k.conindid=i.indexrelid);`);
    const checks =
      json(`SELECT coalesce(json_agg(json_build_object('name',conname,'def',pg_get_constraintdef(oid))), '[]'::json)
      FROM pg_constraint WHERE conrelid=${quote(table)}::regclass AND contype='c';`);
    const defaultSql = sql(
      target,
      `SELECT pg_get_expr(d.adbin,d.adrelid)
      FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid=d.adrelid AND a.attnum=d.adnum
      WHERE a.attrelid=${quote(table)}::regclass AND a.attname=${quote(column)};`,
    ).trim();
    const ident = (value) => `"${value.replaceAll('"', '""')}"`;
    const statements = [
      'BEGIN;',
      ...indexes.map((row) => `DROP INDEX ${ident(row.name)};`),
      ...checks.map((row) => `ALTER TABLE ${table} DROP CONSTRAINT ${ident(row.name)};`),
      `ALTER TABLE ${table} ALTER COLUMN ${column} DROP DEFAULT;`,
      `ALTER TYPE ${type} RENAME TO ${type}_chain_old;`,
      `CREATE TYPE ${type} AS ENUM (${labels.map(quote).join(',')});`,
      `ALTER TABLE ${table} ALTER COLUMN ${column} TYPE ${type} USING ${column}::text::${type};`,
      `DROP TYPE ${type}_chain_old;`,
      ...(defaultSql
        ? [`ALTER TABLE ${table} ALTER COLUMN ${column} SET DEFAULT ${defaultSql};`]
        : []),
      ...checks.map((row) => `ALTER TABLE ${table} ADD CONSTRAINT ${ident(row.name)} ${row.def};`),
      ...indexes.map((row) => `${row.def};`),
      'COMMIT;',
    ];
    sql(target, statements.join('\n'));
    process.stdout.write(`Restored retained ${type}.${removed} on owned white DB only\n`);
  }
}

let created = false;
try {
  if (sql('postgres', `SELECT 1 FROM pg_database WHERE datname=${quote(target)};`).trim()) {
    throw new Error('Target already exists; refusing to reuse or drop an unowned database');
  }
  sql('postgres', `CREATE DATABASE "${target}";`);
  created = true;
  process.stdout.write(`Created approved empty database ${target}\n`);
  deploy();
  const before = schema();
  for (const name of [...rollback].reverse()) {
    process.stdout.write(`DOWN ${name}\n`);
    sql(target, readFileSync(resolve(migrations, name, 'down.sql'), 'utf8'));
    sql(target, `DELETE FROM _prisma_migrations WHERE migration_name=${quote(name)};`);
  }
  restoreRetainedEnums();
  deploy();
  if (before !== schema()) throw new Error('Schema mismatch after full up/down/up round trip');
  process.stdout.write(
    'PASS: full deploy ->16 v46 downs -> redeploy; normalized schemas identical\n',
  );
} finally {
  if (created) {
    sql('postgres', `DROP DATABASE "${target}" WITH (FORCE);`);
    process.stdout.write(`Dropped owned temporary database ${target}\n`);
  }
}
