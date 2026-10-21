'use client';

import { useLocale } from 'next-intl';
import type { ReactNode } from 'react';
import { setFormatLocale } from './format';

/** Đặt locale cho hàm định dạng thuần ngay khi render (không đợi effect) — đặt sát dưới NextIntlClientProvider */
export function LocaleSync({ children }: { children: ReactNode }) {
  setFormatLocale(useLocale());
  return children;
}
