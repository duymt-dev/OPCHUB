import { describe, expect, it } from 'vitest';
import enGB from 'antd/locale/en_GB';
import { BUNDLES } from './locales';
import { loadAntdLocale } from './antd-locales';
import { translateAntdLocale } from './antd/translate-locale';

describe('D-141 AC824-09 installed and custom AntD dictionaries', () => {
  it.each(BUNDLES)(
    'loads a real serializable %s control dictionary without guessed module names',
    async (bundle) => {
      const locale = await loadAntdLocale(bundle);
      expect(typeof locale.locale).toBe('string');
      expect(locale.DatePicker?.lang.placeholder).toBeTruthy();
      expect(locale.Empty?.description).toBeTruthy();
      expect(JSON.parse(JSON.stringify(locale))).toEqual(locale);
    },
  );

  it('shares alias resources, isolates concurrent reads and preserves the English source object', async () => {
    const before = JSON.stringify(enGB);
    const [en, sg, ms, bn, fil, lo] = await Promise.all(
      ['en', 'en-SG', 'ms', 'ms-BN', 'fil', 'lo'].map(loadAntdLocale),
    );
    expect(en).toEqual(sg);
    expect(ms).toEqual(bn);
    expect(fil?.Empty?.description).toBe('Walang datos');
    expect(lo?.Empty?.description).toBe('ບໍ່ມີຂໍ້ມູນ');
    expect(JSON.stringify(enGB)).toBe(before);
    expect(await loadAntdLocale('../../en')).toEqual(await loadAntdLocale('vi'));
  });

  it('fails closed if an installed visible phrase is not translated instead of leaking English', () => {
    expect(() => translateAntdLocale(enGB, {})).toThrow('Untranslated AntD locale text');
  });
});
