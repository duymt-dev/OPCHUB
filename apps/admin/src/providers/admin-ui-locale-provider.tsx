'use client';

import type { ReactNode } from 'react';
import type { ConfigProviderProps } from 'antd';
import { UiProvider } from '@opchub/ui';
import 'dayjs/locale/vi';
import 'dayjs/locale/en-gb';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/id';
import 'dayjs/locale/th';
import 'dayjs/locale/ms';
import 'dayjs/locale/tl-ph';
import 'dayjs/locale/km';
import 'dayjs/locale/lo';
import 'dayjs/locale/my';

/** Registration imports do not select a global locale. No keyed subtree/effect: drafts survive switching. */
export function AdminUiLocaleProvider({
  locale,
  children,
}: {
  locale: NonNullable<ConfigProviderProps['locale']> | undefined;
  children: ReactNode;
}) {
  return <UiProvider {...(locale ? { locale } : {})}>{children}</UiProvider>;
}
