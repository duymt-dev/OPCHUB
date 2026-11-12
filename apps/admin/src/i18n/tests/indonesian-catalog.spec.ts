import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { catalogIssues } from './message-contract';

/** Explicit checkpoint scope, not the final all-language gate. Missing entries in this list must fail. */
const COMPLETE_FILES = [
  'auth',
  'common',
  'overview',
  'meta',
  'ui',
  'bot-options',
  'affiliate',
  'reports',
  'needs',
  'investors',
  'requests',
  'stores',
  'fees',
  'projects',
  'events',
  'members',
  'marketing',
  'groups',
  'bots',
  'settings/core',
  'settings/access',
  'settings/mail',
  'settings/audit',
  'settings/finance',
  'settings/ai',
] as const;

const sameTextReasons = new Map([
  ['settings/core.general.tz.ict', 'Official geographic names in the existing time-zone option'],
  [
    'settings/access.admins.drawer.namePh',
    'Existing proper-name example; not translated person data',
  ],
  ['settings/mail.mail.sampleName', 'Existing proper-name example; not translated person data'],
  ['settings/finance.bank.syntaxValue', 'Canonical OPCHUB transfer-reference example (D-123)'],
  ['marketing.mail.sampleName', 'Existing proper-name example; not translated person data'],
  ['bots.pf.namePh', 'Existing proper-name example; not translated person data'],
]);
const emptyTextReasons = new Map([
  ['settings/finance.renewal.actions', 'Existing intentionally blank actions-column header'],
]);

const read = (locale: string, file: string): unknown =>
  JSON.parse(
    readFileSync(join(__dirname, '../../../messages', locale, `${file}.json`), 'utf8'),
  ) as unknown;

describe('D-141 AC824-02 completed Indonesian raw catalogs - no fallback', () => {
  it.each(COMPLETE_FILES)(
    '%s has exact source keys/types/ICU and no untranslated prose',
    (file) => {
      expect(
        catalogIssues(
          read('vi', file),
          read('id', file),
          {
            locale: 'id',
            sameTextReasons,
            emptyTextReasons,
          },
          file,
        ),
      ).toEqual([]);
    },
  );

  it.each([
    ['reports', 'title', 'Laporan'],
    ['common', 'nav.reports', 'Laporan'],
    ['settings/audit', 'log.tag.report', 'Laporan'],
    ['marketing', 'form.body', 'Isi email'],
    ['settings/audit', 'log.tag.content', 'Konten'],
    ['settings/audit', 'log.filterTag', 'Kategori'],
    ['overview', 'flow.needs.name', 'Kebutuhan terbuka'],
    ['events', 'status.open', 'Pendaftaran terbuka'],
    ['events', 'card.list', 'Daftar peserta'],
    ['members', 'drawer.rep', 'Perwakilan'],
    ['affiliate', 'regional.share.pendingStatus', 'Menunggu pembayaran akhir bulan'],
    ['projects', 'val.repoPublic', 'Publik'],
    ['projects', 'val.repoPrivate', 'Privat'],
    ['auth', 'login.tagUser', 'Pengguna'],
  ])('D-141 AC824-06 preserves Admin context at %s.%s', (file, key, expected) => {
    expect(valueAt(read('id', file ?? ''), key ?? '')).toBe(expected);
  });

  it.each([...sameTextReasons.keys()])('D-141 AC824-11/12 keeps canonical example %s', (path) => {
    const dot = path.indexOf('.');
    const file = path.slice(0, dot),
      key = path.slice(dot + 1);
    expect(valueAt(read('id', file), key)).toBe(valueAt(read('vi', file), key));
  });
});

function valueAt(node: unknown, key: string): unknown {
  for (const part of key.split('.')) {
    if (!node || typeof node !== 'object' || !Object.hasOwn(node, part)) throw new Error(key);
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}
