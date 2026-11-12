import type { ConfigProviderProps } from 'antd';
import { bundleOf } from './locales';
import type { Bundle } from './locales';

type ControlLocale = NonNullable<ConfigProviderProps['locale']>;

/** Server-side finite import map: serialize only the selected control dictionary to the client. */
const LOADERS: Record<Bundle, () => Promise<ControlLocale>> = {
  vi: () => import('antd/locale/vi_VN').then((m) => m.default),
  en: () => import('antd/locale/en_GB').then((m) => m.default),
  zh: () => import('antd/locale/zh_CN').then((m) => m.default),
  id: () => import('antd/locale/id_ID').then((m) => m.default),
  th: () => import('antd/locale/th_TH').then((m) => m.default),
  ms: () => import('antd/locale/ms_MY').then((m) => m.default),
  fil: () => import('./antd/fil').then((m) => m.filLocale),
  km: () => import('antd/locale/km_KH').then((m) => m.default),
  lo: () => import('./antd/lo').then((m) => m.loLocale),
  my: () => import('antd/locale/my_MM').then((m) => m.default),
};

export const loadAntdLocale = (locale: string | undefined): Promise<ControlLocale> =>
  LOADERS[bundleOf(locale)]();
