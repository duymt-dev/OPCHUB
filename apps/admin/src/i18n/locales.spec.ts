import { describe, expect, it } from 'vitest';
import { languages } from '@opchub/shared/fixtures';
import { BUNDLES, bundleOf, intlLocaleOf, localeProfileOf, selectedLocaleOf } from './locales';

describe('D-141 AC824-01 locale allowlist', () => {
  it('retains all 12 selector identities and exactly 10 bundles', () => {
    expect(languages).toHaveLength(12);
    expect(BUNDLES).toEqual(['vi', 'en', 'zh', 'id', 'th', 'ms', 'fil', 'km', 'lo', 'my']);
    for (const language of languages) {
      expect(selectedLocaleOf(language.code)).toBe(language.code);
      expect(BUNDLES).toContain(bundleOf(language.code));
      expect(localeProfileOf(language.code).dayjs).toBeTruthy();
      expect(localeProfileOf(language.code).antd).toBeTruthy();
    }
  });

  it('aliases messages but preserves Singapore and Brunei formatting and identity', () => {
    expect(bundleOf('en-SG')).toBe('en');
    expect(intlLocaleOf('en-SG')).toBe('en-SG');
    expect(selectedLocaleOf('en-SG')).toBe('en-SG');
    expect(bundleOf('ms-BN')).toBe('ms');
    expect(intlLocaleOf('ms-BN')).toBe('ms-BN');
    expect(selectedLocaleOf('ms-BN')).toBe('ms-BN');
    expect(localeProfileOf('fil')).toEqual({ intl: 'fil-PH', dayjs: 'tl-ph', antd: 'fil' });
    expect(localeProfileOf('lo')).toEqual({ intl: 'lo-LA', dayjs: 'lo', antd: 'lo' });
  });

  it.each([undefined, '', 'xx', 'EN', 'en-us', '../en', '../../vi', '__proto__', 'constructor'])(
    'fails closed for cookie %s before any import',
    (cookie) => {
      expect(selectedLocaleOf(cookie)).toBe('vi');
      expect(bundleOf(cookie)).toBe('vi');
      expect(intlLocaleOf(cookie)).toBe('vi-VN');
    },
  );
});
