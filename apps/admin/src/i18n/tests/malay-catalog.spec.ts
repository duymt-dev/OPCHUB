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

describe('D-141 AC824-02 completed Malay raw catalogs - no fallback', () => {
  it.each(COMPLETE_FILES)(
    '%s has exact source keys/types/ICU and no untranslated prose',
    (file) => {
      expect(
        catalogIssues(
          read('vi', file),
          read('ms', file),
          {
            locale: 'ms',
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
    ['marketing', 'form.body', 'Kandungan e-mel'],
    ['settings/audit', 'log.tag.content', 'Kandungan'],
    ['settings/audit', 'log.filterActor', 'Pelaku'],
    ['overview', 'flow.needs.name', 'Keperluan terbuka'],
    ['events', 'status.open', 'Pendaftaran dibuka'],
    ['members', 'drawer.rep', 'Wakil'],
    ['members', 'filters.role.expert', 'Pakar'],
    ['affiliate', 'regional.share.pendingStatus', 'Menunggu pembayaran hujung bulan'],
    ['projects', 'val.repoPublic', 'Awam'],
    ['projects', 'val.repoPrivate', 'Persendirian'],
    ['auth', 'login.tagUser', 'Pengguna'],
    ['auth', 'login.welcomeAdmin', 'Log masuk ke Papan Pemuka Admin'],
    ['auth', 'login.welcomeUser', 'Helo, log masuk ke Portal Pengguna'],
    ['events', 'card.list', 'Senarai peserta'],
    ['settings/ai', 'ai.budget', 'Bajet bulanan (VND)'],
    ['settings/finance', 'bank.content', 'Rujukan pindahan'],
    ['ui', 'errors.confirmPasswordRequired', 'Sila sahkan kata laluan baharu anda'],
    ['bots', 'pf.basic', 'MAKLUMAT ASAS'],
    ['bot-options', 'genders.0', 'Lelaki'],
    ['settings/core', 'general.timezone', 'Zon masa'],
  ])('D-141 AC824-06 preserves Admin context at %s.%s', (file, key, expected) => {
    expect(valueAt(read('ms', file ?? ''), key ?? '')).toBe(expected);
  });

  it.each([...sameTextReasons.keys()])('D-141 AC824-11/12 keeps canonical example %s', (path) => {
    const dot = path.indexOf('.');
    const file = path.slice(0, dot),
      key = path.slice(dot + 1);
    expect(valueAt(read('ms', file), key)).toBe(valueAt(read('vi', file), key));
  });
});

function valueAt(node: unknown, key: string): unknown {
  for (const part of key.split('.')) {
    if (!node || typeof node !== 'object' || !Object.hasOwn(node, part)) throw new Error(key);
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}
