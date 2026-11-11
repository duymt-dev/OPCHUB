import { cleanup, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { messages } from './messages';
import englishUi from '../../messages/en/ui.json';
import { useAdminUiLabels } from './ui-labels';

afterEach(cleanup);

describe('D-141 AC824-09 translated shared-component label props', () => {
  it.each(['vi', 'en'])('provides every editor/pagination/calendar/bulk label for %s', (locale) => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NextIntlClientProvider
        locale={locale}
        timeZone="Asia/Ho_Chi_Minh"
        messages={{ ...messages, ui: locale === 'en' ? englishUi : messages.ui }}
      >
        {children}
      </NextIntlClientProvider>
    );
    const { result } = renderHook(useAdminUiLabels, { wrapper });
    expect(result.current.pagination.range(1, 20, 1234, 'items')).toContain(
      locale === 'en' ? '1,234' : '1.234',
    );
    expect(result.current.pagination.prev).toBe(locale === 'en' ? 'Previous page' : 'Trang trước');
    expect(result.current.editor.linkInsert).toBe(locale === 'en' ? 'Insert' : 'Chèn');
    expect(result.current.editor.linkInvalid).toContain('https://');
    expect(result.current.bulk.clearLabel).toBe(locale === 'en' ? 'Clear selection' : 'Bỏ chọn');
    expect(result.current.bulk.formatCount?.(1234)).toBe(locale === 'en' ? '1,234' : '1.234');
    expect(result.current.pagination.number?.(1234)).toBe(locale === 'en' ? '1,234' : '1.234');
    expect(result.current.dateRange.presets).toHaveLength(5);
    expect(result.current.dateRange.dateLocale).toBe(locale === 'en' ? 'en-gb' : 'vi');
  });
});
