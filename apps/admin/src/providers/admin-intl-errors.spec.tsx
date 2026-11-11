import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminIntlErrors } from './admin-intl-errors';
import { messages } from '@/i18n/messages';
import englishUi from '../../messages/en/ui.json';

vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));
afterEach(cleanup);

function InvalidMessage() {
  const t = useTranslations();
  return <p>{t('ui.editor.undo')}</p>;
}

describe('D-141 AC824-03/15 safe client message fallback', () => {
  it('uses readable selected-language fallback for malformed ICU, never raw keys/stack/variables', () => {
    render(
      <NextIntlClientProvider
        locale="en"
        timeZone="Asia/Ho_Chi_Minh"
        messages={{
          ...messages,
          ui: { ...englishUi, editor: { ...englishUi.editor, undo: '{name' } },
        }}
      >
        <AdminIntlErrors>
          <InvalidMessage />
        </AdminIntlErrors>
      </NextIntlClientProvider>,
    );
    expect(screen.getByText('The action failed. Please try again')).toBeTruthy();
    expect(screen.queryByText('ui.editor.undo')).toBeNull();
    expect(screen.queryByText('{name')).toBeNull();
  });
});
