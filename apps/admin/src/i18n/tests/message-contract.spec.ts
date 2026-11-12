import { describe, expect, it } from 'vitest';
import { catalogFilesIssues, catalogIssues } from './message-contract';

const en = { locale: 'en' };
const reasons = (source: unknown, target: unknown) =>
  catalogIssues(source, target, en).map((i) => i.reason);

describe('D-141 AC824-02 raw catalog contract checker', () => {
  it('accepts translated ICU argument, plural, select and rich text contracts', () => {
    const source = {
      count: '{n, plural, other {<b>{name}</b>: #}}',
      status: '{status, select, active {Hoạt động} other {Khác}}',
    };
    const translated = {
      count: '{n, plural, one {<b>{name}</b>: # member} other {<b>{name}</b>: # members}}',
      status: '{status, select, active {Active} other {Other}}',
    };
    expect(catalogIssues(source, translated, en)).toEqual([]);
  });

  it.each([
    ['{name}', '{names}', 'icu-contract'],
    ['{n}', '{n, number}', 'icu-contract'],
    ['{at, date}', '{at, time}', 'icu-contract'],
    ['<b>{name}</b>', '<i>{name}</i>', 'icu-contract'],
    [
      '{status, select, active {A} other {B}}',
      '{status, select, wrong {A} other {B}}',
      'icu-contract',
    ],
    ['{n, plural, =0 {A} other {B}}', '{n, plural, one {A} other {B}}', 'icu-contract'],
    ['{n, plural, offset:1 other {B}}', '{n, plural, other {B}}', 'icu-contract'],
    ['{name}', '{name', 'invalid-icu'],
    ['<b>{name}</b>', '<b>{name}', 'invalid-icu'],
  ])('rejects changed or malformed ICU %s -> %s', (source, target, expected) => {
    expect(reasons(source, target)).toContain(expected);
  });

  it('understands escaped ICU literals instead of treating them as variable references', () => {
    expect(reasons("'{ignored}' {name}", "'{literal}' {name}")).toEqual([]);
    expect(reasons("'{ignored}' {name}", '{ignored} {name}')).toContain('icu-contract');
  });

  it('rejects wrong shape, missing/extra keys and dropped array entries', () => {
    expect(reasons({ a: 'A' }, {})).toContain('missing');
    expect(reasons({ a: 'A' }, { a: 'A', b: 'B' })).toContain('extra');
    expect(reasons({ a: 'A' }, { a: null })).toContain('shape');
    expect(reasons(['A', 'B'], ['A'])).toContain('missing');
    expect(reasons(['A', 'B'], { 0: 'A', 1: 'B' })).toContain('shape');
    expect(reasons({ a: false }, { a: false })).toContain('invalid-source-shape');
  });

  it('rejects empty/TODO/non-NFC strings and untranslated Vietnamese unless an exact reason is given', () => {
    expect(reasons('Xin chào', '')).toContain('empty');
    expect(reasons('Xin chào', '[TODO]')).toContain('placeholder');
    expect(reasons('Xin chào', 'Xin chào')).toContain('untranslated');
    expect(reasons('Café', 'Cafe\u0301')).toContain('not-nfc');
    expect(
      catalogIssues(
        'Hồ Chí Minh',
        'Hồ Chí Minh',
        {
          locale: 'en',
          sameTextReasons: new Map([['province', 'Official geographic proper name']]),
        },
        'province',
      ),
    ).toEqual([]);
    expect(
      catalogIssues(
        'Hồ Chí Minh',
        'Hồ Chí Minh',
        {
          locale: 'en',
          sameTextReasons: new Map([['other', 'Unrelated key']]),
        },
        'province',
      ).map((i) => i.reason),
    ).toContain('untranslated');
  });

  it('fails when an entire expected locale or file is absent, using isolated fixture readers', () => {
    const read = (locale: string, file: string) => {
      if (locale === 'vi') return { title: 'Tổng quan' };
      if (locale === 'en' && file === 'common') return { title: 'Overview' };
      throw new Error('Fixture file absent');
    };
    expect(catalogFilesIssues(['en', 'th'], ['common', 'auth'], read)).toEqual([
      { path: 'en/auth', reason: 'missing-or-invalid-file' },
      { path: 'th/common', reason: 'missing-or-invalid-file' },
      { path: 'th/auth', reason: 'missing-or-invalid-file' },
    ]);
  });

  it('allows only explicitly documented baseline-empty labels, never blanking a nonempty source', () => {
    const policy = {
      locale: 'en',
      emptyTextReasons: new Map([['actions', 'Existing blank column header']]),
    };
    expect(catalogIssues('', '', policy, 'actions')).toEqual([]);
    expect(catalogIssues('Actions', '', policy, 'actions').map((i) => i.reason)).toContain('empty');
    expect(catalogIssues('', '', policy, 'unknown').map((i) => i.reason)).toContain('empty');
    expect(catalogIssues('', ' ', policy, 'actions').map((i) => i.reason)).toContain('empty');
  });
});
