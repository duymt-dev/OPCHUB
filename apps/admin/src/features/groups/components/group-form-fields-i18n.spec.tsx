import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, expect, it } from 'vitest';
import en from '../../../../messages/en/groups.json';
import source from '../../../../messages/vi/groups.json';
import enUi from '../../../../messages/en/ui.json';
import viUi from '../../../../messages/vi/ui.json';
import { emptyGroupForm } from '../model';
import { BasicFields } from './group-form-fields';

afterEach(cleanup);

function Fields() {
  const [form, set] = useState(emptyGroupForm);
  return (
    <BasicFields
      f={form}
      set={(patch) => set((f) => ({ ...f, ...patch }))}
      err={() => undefined}
      kind={null}
    />
  );
}

it.each([
  ['Hà Nội', 'Northern', 'Miền Bắc'],
  ['Đà Nẵng', 'Central', 'Miền Trung'],
  ['TP. Hồ Chí Minh', 'Southern', 'Miền Nam'],
] as const)(
  'D-141 AC824-10/11 group province %s projects a live region label without translating drafts',
  (province, english, vietnamese) => {
    const view = (locale: 'en' | 'vi') => (
      <NextIntlClientProvider
        locale={locale}
        timeZone="Asia/Ho_Chi_Minh"
        messages={{ groups: locale === 'en' ? en : source, ui: locale === 'en' ? enUi : viUi }}
      >
        <Fields />
      </NextIntlClientProvider>
    );
    const rendered = render(view('en'));
    fireEvent.change(screen.getByLabelText(en.form.province, { exact: false }), {
      target: { value: province },
    });
    fireEvent.change(screen.getByLabelText(en.form.name, { exact: false }), {
      target: { value: 'Raw group draft' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: en.form.desc }), {
      target: { value: 'Mô tả giữ nguyên' },
    });
    expect(screen.getByText(`Region: ${english}`)).toBeTruthy();
    rendered.rerender(view('vi'));
    expect(screen.getByText(source.form.region.replace('{region}', vietnamese))).toBeTruthy();
    expect(screen.getByRole<HTMLSelectElement>('combobox').value).toBe(province);
    expect(
      screen.getByRole<HTMLInputElement>('textbox', { name: new RegExp(source.form.name) }).value,
    ).toBe('Raw group draft');
    expect(screen.getByRole<HTMLTextAreaElement>('textbox', { name: source.form.desc }).value).toBe(
      'Mô tả giữ nguyên',
    );
    rendered.rerender(view('en'));
    expect(screen.getByText(`Region: ${english}`)).toBeTruthy();
    expect(screen.getByRole<HTMLSelectElement>('combobox').value).toBe(province);
  },
);
