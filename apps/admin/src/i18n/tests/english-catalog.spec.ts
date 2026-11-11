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

describe('D-141 AC824-02 completed English raw catalogs - no fallback', () => {
  it.each(COMPLETE_FILES)(
    '%s has exact source keys/types/ICU and no untranslated prose',
    (file) => {
      expect(
        catalogIssues(
          read('vi', file),
          read('en', file),
          {
            locale: 'en',
            sameTextReasons,
            emptyTextReasons,
          },
          file,
        ),
      ).toEqual([]);
    },
  );
});
