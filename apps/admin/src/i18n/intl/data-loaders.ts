import { registrationData } from './registration-data';

// Official package resources are checked against the committed receipt, not HTTP input.
// Explicit imports prevent arbitrary cookies from becoming module specifiers.
export const dataLoaders = {
  km: async () => {
    const [, , timezone] = await Promise.all([
      import('@formatjs/intl-datetimeformat/locale-data/km.js'),
      import('@formatjs/intl-numberformat/locale-data/km.js'),
      import('../intl-data/vietnam-time-zone.json'),
    ]);
    return { ...registrationData('km'), timezone: timezone.default };
  },
  lo: async () => {
    const [, , timezone] = await Promise.all([
      import('@formatjs/intl-datetimeformat/locale-data/lo.js'),
      import('@formatjs/intl-numberformat/locale-data/lo.js'),
      import('../intl-data/vietnam-time-zone.json'),
    ]);
    return { ...registrationData('lo'), timezone: timezone.default };
  },
  my: async () => {
    const [, , timezone] = await Promise.all([
      import('@formatjs/intl-datetimeformat/locale-data/my.js'),
      import('@formatjs/intl-numberformat/locale-data/my.js'),
      import('../intl-data/vietnam-time-zone.json'),
    ]);
    return { ...registrationData('my'), timezone: timezone.default };
  },
} as const;
