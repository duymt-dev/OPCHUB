import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import enGB from 'antd/locale/en_GB';
import viVN from 'antd/locale/vi_VN';
import { Empty } from 'antd';
import { AdminUiLocaleProvider } from './admin-ui-locale-provider';

afterEach(cleanup);

function Draft() {
  const [value, setValue] = useState('');
  return (
    <input aria-label="draft fixture" value={value} onChange={(e) => setValue(e.target.value)} />
  );
}

describe('D-141 AC824-09/10 Admin control locale bridge', () => {
  it('updates control copy without replacing the subtree, losing drafts or selecting a global dayjs locale', () => {
    const globalLocale = dayjs.locale();
    const view = render(
      <AdminUiLocaleProvider locale={viVN}>
        <Draft />
        <Empty image={false} />
      </AdminUiLocaleProvider>,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'unsaved draft' } });
    view.rerender(
      <AdminUiLocaleProvider locale={enGB}>
        <Draft />
        <Empty image={false} />
      </AdminUiLocaleProvider>,
    );
    expect(screen.getByDisplayValue('unsaved draft')).toBeTruthy();
    expect(screen.getByText('No data')).toBeTruthy();
    expect(dayjs.locale()).toBe(globalLocale);
    expect(dayjs('2026-10-16').locale('tl-ph').locale()).toBe('tl-ph');
    expect(dayjs('2026-10-16').locale('lo').locale()).toBe('lo');
  });
});
