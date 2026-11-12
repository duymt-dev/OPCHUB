import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

// Build-only extraction of trusted, pinned package data; never evaluated in the app.
const root = resolve(import.meta.dirname, '../..');
const require = createRequire(resolve(root, 'apps/admin/package.json'));
const output = resolve(root, 'apps/admin/src/i18n/intl-data');
const packages = {
  date: ['@formatjs/intl-datetimeformat', '8.0.3', 'DateTimeFormat'],
  number: ['@formatjs/intl-numberformat', '10.0.4', 'NumberFormat'],
};
const sha = (value) => createHash('sha256').update(value).digest('hex');
const receipt = { cldr: '49', packages: {}, localeSources: {}, assets: {} };
mkdirSync(output, { recursive: true });

function save(name, value, sourceSha256) {
  const bytes = JSON.stringify(value, null, 2) + '\n';
  writeFileSync(resolve(output, name), bytes);
  receipt.assets[name] = { bytes: Buffer.byteLength(bytes), sha256: sha(bytes), sourceSha256 };
}

let license;
for (const [kind, [name, version, constructor]] of Object.entries(packages)) {
  const base = dirname(require.resolve(name));
  if (JSON.parse(readFileSync(resolve(base, 'package.json'), 'utf8')).version !== version)
    throw new Error(`Unexpected ${name} version`);
  const text = readFileSync(resolve(base, 'LICENSE.md'), 'utf8');
  if (license && license !== text) throw new Error('Upstream licenses differ');
  license = text;
  receipt.packages[name] = { version, licenseSha256: sha(text) };
  for (const locale of ['km', 'lo', 'my']) {
    const source = readFileSync(resolve(base, `locale-data/${locale}.js`), 'utf8');
    const captured = [];
    runInNewContext(
      source,
      {
        Intl: { [constructor]: { __addLocaleData: (data) => captured.push(data) } },
      },
      { timeout: 1000 },
    );
    if (captured.length !== 1 || captured[0].locale !== locale)
      throw new Error(`Unexpected ${kind}/${locale} data`);
    receipt.localeSources[`${locale}-${kind}`] = {
      package: name,
      file: `locale-data/${locale}.js`,
      bytes: Buffer.byteLength(source),
      sha256: sha(source),
    };
  }
  if (kind === 'date') {
    const source = readFileSync(resolve(base, 'add-golden-tz.js'), 'utf8');
    let timezones;
    runInNewContext(
      source,
      {
        Intl: {
          DateTimeFormat: {
            __addTZData: (data) => {
              timezones = data;
            },
          },
        },
      },
      { timeout: 1000 },
    );
    const zones = timezones.zones.filter((zone) => zone.startsWith('Asia/Ho_Chi_Minh|'));
    if (zones.length !== 1) throw new Error('Missing exact Vietnam IANA record');
    save('vietnam-time-zone.json', { ...timezones, zones }, sha(source));
  }
}
writeFileSync(resolve(output, 'LICENSE.txt'), license);
const publicLicenses = resolve(root, 'apps/admin/public/licenses');
mkdirSync(publicLicenses, { recursive: true });
writeFileSync(resolve(publicLicenses, 'formatjs-intl.txt'), license);
writeFileSync(resolve(output, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
process.stdout.write(JSON.stringify(receipt, null, 2) + '\n');
