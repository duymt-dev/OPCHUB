import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Messages } from './messages';

export type PageKey = Exclude<keyof Messages['common']['meta'], 'app' | 'title'>;

/** Tiêu đề tab theo ngôn ngữ (D-65): `<trang> · OPC Hub` — dùng `export const generateMetadata = pageMeta('…')` */
export const pageMeta = (key: PageKey) => async (): Promise<Metadata> => {
  const t = await getTranslations('common.meta');
  return { title: t('title', { page: t(key) }) };
};
