// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { auditSourceFixture } from '../../../../../infra/scripts/admin-i18n/audit-core.mjs';

const root = resolve(__dirname, '../../../../..');
const file = 'apps/admin/src/__source_audit_fixture.tsx';
const schema = z.object({
  status: z.enum(['PASS', 'FAIL']),
  rows: z.array(
    z.object({
      kind: z.string(),
      text: z.string(),
      disposition: z.string(),
    }),
  ),
  errors: z.array(z.unknown()),
});
function audit(source: string, exceptions: readonly unknown[] = []) {
  const result = schema.parse(auditSourceFixture(root, { file, source, exceptions }));
  return { code: result.status === 'PASS' ? 0 : 1, ...result };
}
const translated = "import {useTranslations as useT} from 'next-intl';";

describe('D-141 AC824-06/08 complete-source audit negative fixtures', () => {
  it.each([
    '<h1>Overview</h1>',
    '<h1>{String.raw`hello`}</h1>',
    'const heading="hello"; function C(){return <h1>{heading}</h1>}',
    '<input aria-label="Search members" placeholder="Search..." />',
    'const options=[{value:"open",label:"Open"}];',
    `${translated} function C(){const t=useT('ui');return <b>{t('caption',{label:'untranslated'})}</b>}`,
  ])('finds visible English/unaccented/indirect literals: %s', (source) => {
    const r = audit(source);
    expect(r.status).toBe('FAIL');
    expect(r.rows.some((row) => row.kind === 'ui-literal')).toBe(true);
  });
  it.each([
    'function C({n}:{n:number}){return <b>{n}</b>}',
    'function C({n}:{n:number|undefined}){return <b>{n ?? 0}</b>}',
    'function C({n}:{n:number}){return <b>{String(n)}</b>}',
    'function C({n}:{n:number}){return <b>{n.toFixed(1)}</b>}',
    `${translated} function C({n}:{n:number}){const t=useT('ui');return <b>{t('count',{n})}</b>}`,
  ])('finds raw numeric display or translation bindings: %s', (source) => {
    expect(audit(source).rows.some((row) => row.kind.startsWith('numeric'))).toBe(true);
  });
  it('preserves nullish fallback as a whole numeric expression, never formatting its left side first', () => {
    const rows = audit('function C({n}:{n:number|undefined}){return <b>{n ?? 0}</b>}').rows;
    expect(rows.filter((row) => row.kind === 'numeric-jsx').map((row) => row.text)).toEqual([
      'n ?? 0',
    ]);
  });
  it('retains both occurrences on one line', () => {
    const rows = audit('function C({n}:{n:number}){return <b>{n}/{n}</b>}').rows;
    expect(rows.filter((row) => row.kind === 'numeric-jsx')).toHaveLength(2);
  });
  it('does not classify translated keys, canonical input attributes, SVG paths or keyboard comparisons as UI', () => {
    const r =
      audit(`${translated} const icon='M8 2v4M16 2v4'; function C({n,key}:{n:number,key:string}){const t=useT('ui');
      if(key==='Escape')return <input type="number" value={n} />;
      return <b>{t('count',{n:new Intl.NumberFormat('en').format(n)})}</b>}`);
    expect(r.status).toBe('PASS');
  });
  it.each([
    [
      '<b>Google</b>',
      { file, kind: 'ui-literal', text: 'Google', reason: 'Locale-independent provider brand' },
      'PASS',
    ],
    [
      '<b>New heading</b>',
      { file, kind: 'ui-literal', text: 'Google', reason: 'Locale-independent provider brand' },
      'FAIL',
    ],
    ['<b>Google</b>', { file, kind: 'ui-literal', text: 'Google', reason: '' }, 'FAIL'],
    [
      '<b>Google</b>',
      { file: 'apps/admin/src/*', kind: 'ui-literal', text: 'Google', reason: 'Blanket' },
      'FAIL',
    ],
  ] as const)('requires an exact file/literal/reason: %s', (source, exception, expected) => {
    expect(audit(source, [exception]).status).toBe(expected);
  });
  it('binds enum exceptions to their actual values so new upstream untranslated names cannot slip through', () => {
    const exception = {
      file,
      kind: 'enum-jsx',
      text: 'state',
      values: ['A', 'B'],
      reason: 'Canonical technical codes',
    };
    expect(
      audit("function C({state}:{state:'A'|'B'}){return <b>{state}</b>}", [exception]).status,
    ).toBe('PASS');
    expect(
      audit("function C({state}:{state:'A'|'B'|'C'}){return <b>{state}</b>}", [exception]).status,
    ).toBe('FAIL');
  });
});

it.each(['const n=1;', '<b>Untranslated</b>'])(
  'D-141 AC824-06/08 actual CLI matches shared core JSON and exit: %s',
  (source) => {
    const fixture = { file, source, exceptions: [] };
    const contract = schema.extend({
      sourceFiles: z.number(),
      rows: z.array(z.json()),
      unreviewed: z.array(z.json()),
    });
    const expected = contract.parse(
      JSON.parse(JSON.stringify(auditSourceFixture(root, fixture))) as unknown,
    );
    const actual = spawnSync(
      process.execPath,
      ['infra/scripts/audit-admin-i18n.mjs', '--fixture'],
      {
        cwd: root,
        encoding: 'utf8',
        input: JSON.stringify(fixture),
      },
    );
    expect(actual.status, actual.stderr).toBe(expected.status === 'PASS' ? 0 : 1);
    expect(contract.parse(JSON.parse(actual.stdout) as unknown)).toEqual(expected);
  },
);

it('D-141 AC824-06 actual CLI retains invalid-fixture exit2 and stderr contract', () => {
  const actual = spawnSync(process.execPath, ['infra/scripts/audit-admin-i18n.mjs', '--fixture'], {
    cwd: root,
    encoding: 'utf8',
    input: JSON.stringify({ file, source: 42 }),
  });
  expect(actual.status).toBe(2);
  expect(actual.stdout.trim()).toBe('');
  expect(actual.stderr).toContain('Invalid fixture');
});
