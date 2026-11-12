import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import {
  PRODUCTION_MESSAGES,
  REQUIRED_BUNDLES,
  REQUIRED_FILES,
  productionCatalogIssues,
  readRawCatalog,
} from './production-catalogs';
import { COPY_POLICY } from './production-copy-policy';

describe('D-141 AC824-02 fixed10-bundle production gate, raw filesystem not fallback', () => {
  it('requires exactly10 identities and25 explicit files, including source', () => {
    expect(REQUIRED_BUNDLES).toEqual(['vi', 'en', 'zh', 'id', 'th', 'ms', 'fil', 'km', 'lo', 'my']);
    expect(REQUIRED_FILES).toHaveLength(25);
    expect(new Set(REQUIRED_FILES).size).toBe(25);
    expect(COPY_POLICY.size).toBe(92);
  });
  it('passes all250 physical production files, exact keys/types/ICU and reviewed copies only', () => {
    expect(productionCatalogIssues()).toEqual([]);
  });

  let fixture: string;
  beforeAll(() => {
    fixture = mkdtempSync(join(tmpdir(), 'opchub-catalog-gate-'));
  });
  const insideFixture = (path: string) => {
    const absolute = resolve(path);
    if (!absolute.startsWith(resolve(fixture) + sep)) throw new Error('Unsafe fixture path');
    return absolute;
  };
  afterAll(() => {
    const absolute = resolve(fixture);
    if (!absolute.startsWith(resolve(tmpdir()) + sep + 'opchub-catalog-gate-'))
      throw new Error('Unsafe fixture cleanup');
    rmSync(absolute, { recursive: true, force: true });
  });
  const target = () => insideFixture(join(fixture, 'my', 'auth.json'));
  let initialized = false;
  const changed = new Set<string>();
  const restore = () => {
    // Every validation still reads the complete physical tree. Restore only changed
    // fixture paths, not250 unchanged files before each independent mutation.
    const paths = initialized
      ? [...changed]
      : REQUIRED_BUNDLES.flatMap((bundle) =>
          REQUIRED_FILES.map((file) => `${bundle}/${file}.json`),
        );
    for (const path of paths) {
      const dest = insideFixture(join(fixture, path));
      mkdirSync(resolve(dest, '..'), { recursive: true });
      cpSync(join(PRODUCTION_MESSAGES, path), dest);
    }
    changed.clear();
    initialized = true;
  };
  type Auth = { login: { submit: unknown; [key: string]: unknown }; [key: string]: unknown };
  const mutate = (change: (auth: Auth) => void) => {
    changed.add('my/auth.json');
    const auth = JSON.parse(readFileSync(target(), 'utf8')) as Auth;
    change(auth);
    writeFileSync(target(), JSON.stringify(auth));
  };

  it.each(REQUIRED_BUNDLES)('fails when required %s directory is physically removed', (bundle) => {
    restore();
    for (const file of REQUIRED_FILES) changed.add(`${bundle}/${file}.json`);
    rmSync(insideFixture(join(fixture, bundle)), { recursive: true });
    const missing = productionCatalogIssues(fixture);
    expect(missing).toHaveLength(25);
    expect(
      missing.every(
        (x) => x.path.startsWith(`${bundle}/`) && x.reason === 'missing-or-invalid-file',
      ),
    ).toBe(true);
  });
  it.each(REQUIRED_FILES)('fails when physical my/%s catalog is removed', (file) => {
    restore();
    changed.add(`my/${file}.json`);
    rmSync(insideFixture(join(fixture, 'my', `${file}.json`)));
    expect(productionCatalogIssues(fixture)).toEqual([
      { path: `my/${file}`, reason: 'missing-or-invalid-file' },
    ]);
  });
  it.each([
    [
      'missing key',
      (a: Auth) => {
        delete a.login['submit'];
      },
      'missing',
    ],
    [
      'wrong type',
      (a: Auth) => {
        a.login.submit = 42;
      },
      'shape',
    ],
    [
      'extra key',
      (a: Auth) => {
        a.login['unexpected'] = 'မမျှော်လင့်ထားသော';
      },
      'extra',
    ],
    [
      'blank',
      (a: Auth) => {
        a.login.submit = '';
      },
      'empty',
    ],
    [
      'TODO',
      (a: Auth) => {
        a.login.submit = '[TODO]';
      },
      'placeholder',
    ],
    [
      'plain TODO',
      (a: Auth) => {
        a.login.submit = 'TODO';
      },
      'placeholder',
    ],
    [
      'copied Vietnamese',
      (a: Auth) => {
        a.login.submit = 'Đăng nhập';
      },
      'unapproved-source-copy',
    ],
    [
      'malformed ICU',
      (a: Auth) => {
        a.login.submit = '{name';
      },
      'invalid-icu',
    ],
    [
      'changed ICU argument',
      (a: Auth) => {
        a.login.submit = '{invented}';
      },
      'icu-contract',
    ],
  ] as const)('rejects physical %s mutation without falling back', (_name, change, reason) => {
    restore();
    mutate(change);
    expect(productionCatalogIssues(fixture).map((issue) => issue.reason)).toContain(reason);
  });
  it('does not exempt ASCII source copies by another key or wrong locale', () => {
    restore();
    mutate((a) => {
      a.login['tagAdmin'] = 'Admin';
    });
    expect(productionCatalogIssues(fixture)).toContainEqual({
      path: 'my/auth.login.tagAdmin',
      reason: 'unapproved-source-copy',
    });
  });
  it('does not allow stale exact-source exceptions after source wording changes', () => {
    restore();
    const path = insideFixture(join(fixture, 'vi', 'auth.json'));
    changed.add('vi/auth.json');
    const auth = readRawCatalog(fixture, 'vi', 'auth') as Auth;
    auth.login['tagAdmin'] = 'Administrator';
    writeFileSync(path, JSON.stringify(auth));
    expect(productionCatalogIssues(fixture)).toContainEqual({
      path: 'vi/auth.login.tagAdmin',
      reason: 'stale-copy-exception',
    });
  });
  it('rejects TODO placeholders in the Vietnamese source too', () => {
    restore();
    const path = insideFixture(join(fixture, 'vi', 'auth.json'));
    changed.add('vi/auth.json');
    const auth = readRawCatalog(fixture, 'vi', 'auth') as Auth;
    auth.login.submit = 'TODO';
    writeFileSync(path, JSON.stringify(auth));
    expect(productionCatalogIssues(fixture)).toContainEqual({
      path: 'vi/auth.login.submit',
      reason: 'placeholder',
    });
  });
});
