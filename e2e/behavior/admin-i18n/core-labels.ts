import { readFileSync } from 'node:fs';
import { z } from 'zod';

export const CORE_LOCALES = [
  'vi',
  'en',
  'en-SG',
  'zh',
  'id',
  'th',
  'ms',
  'ms-BN',
  'fil',
  'km',
  'lo',
  'my',
] as const;
export const IMAGE_LOCALES = new Set<string>(['vi', 'en', 'zh', 'th', 'km', 'lo', 'my']);

/** Raw expected catalogs, never the app loader's Vietnamese-resolved fallback. */
const raw = (bundle: string, file: string): unknown =>
  JSON.parse(
    readFileSync(
      new URL(`../../../apps/admin/messages/${bundle}/${file}.json`, import.meta.url),
      'utf8',
    ),
  ) as unknown;
const profileSchema = z.object({
  adminProfile: z.object({
    title: z.string(),
    personal: z.string(),
    passwordTitle: z.string(),
    security: z.string(),
    name: z.string(),
    email: z.string(),
  }),
});
const overviewSchema = z.object({
  title: z.string(),
  growth: z.object({ title: z.string() }),
  conversion: z.object({ heading: z.string() }),
});
const settingsSchema = z.object({
  title: z.string(),
  general: z.object({
    heading: z.string(),
    registration: z.string(),
    name: z.string(),
  }),
});

export function coreScreens(locale: (typeof CORE_LOCALES)[number]) {
  const bundle = locale === 'en-SG' ? 'en' : locale === 'ms-BN' ? 'ms' : locale;
  const meta = z.record(z.string(), z.string()).parse(raw(bundle, 'meta'));
  const overview = overviewSchema.parse(raw(bundle, 'overview'));
  const profile = profileSchema.parse(raw(bundle, 'common')).adminProfile;
  const settings = settingsSchema.parse(raw(bundle, 'settings/core'));
  const toast = z
    .object({ login: z.object({ welcomeAdmin: z.string() }) })
    .parse(raw(bundle, 'auth')).login.welcomeAdmin;
  return [
    {
      path: '/overview',
      id: 'overview',
      title: meta['overview'],
      heading: overview.title,
      anchors: [overview.growth.title, overview.conversion.heading],
      toast,
      field: '',
    },
    {
      path: '/profile',
      id: 'profile',
      title: meta['profile'],
      heading: profile.title,
      anchors: [profile.personal, profile.passwordTitle, profile.security],
      toast,
      field: profile.name,
      email: profile.email,
    },
    {
      path: '/settings',
      id: 'settings',
      title: meta['settings'],
      heading: settings.title,
      anchors: [settings.general.heading, settings.general.registration],
      toast,
      field: settings.general.name,
    },
  ] as const;
}
