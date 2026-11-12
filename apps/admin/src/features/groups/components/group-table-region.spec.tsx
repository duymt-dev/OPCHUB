import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, expect, it, vi } from 'vitest';
import en from '../../../../messages/en/groups.json';
import source from '../../../../messages/vi/groups.json';
import enUi from '../../../../messages/en/ui.json';
import viUi from '../../../../messages/vi/ui.json';
import { groupItemSchema } from '@opchub/shared/api-domains';
import { GroupTable } from './group-table';

afterEach(cleanup);
it.each([
  ['Miền Bắc', 'Northern'],
  ['Miền Trung', 'Central'],
  ['Miền Nam', 'Southern'],
  ['Vùng tự nhập tip824', 'Vùng tự nhập tip824'],
])(
  'D-141 AC824-11 group table projects %s without translating DTO/action values',
  (region, label) => {
    const group = {
      ...groupItemSchema.parse({
        id: 'owned-fixture',
        name: 'Tên nhóm tự nhập',
        province: 'Hà Nội',
        region,
        kind: 'industry',
        industry: 'Ngành tự nhập',
        parentId: 'parent',
        memberCount: 1,
        weeklyActive: 0,
        description: 'Mô tả tự nhập',
        myStatus: null,
        coverUrl: null,
        avatars: [],
      }),
      order: 0,
    };
    const before = structuredClone(group);
    const actions = { onEdit: vi.fn(), onExport: vi.fn(), onChat: vi.fn(), onDelete: vi.fn() };
    const view = (locale: 'en' | 'vi') => (
      <NextIntlClientProvider
        locale={locale}
        timeZone="Asia/Ho_Chi_Minh"
        messages={{ groups: locale === 'en' ? en : source, ui: locale === 'en' ? enUi : viUi }}
      >
        <GroupTable
          items={[group]}
          selected={new Set()}
          onToggle={vi.fn()}
          onToggleAll={vi.fn()}
          actions={actions}
        />
      </NextIntlClientProvider>
    );
    const rendered = render(view('en'));
    expect(screen.getByText(`Hà Nội · ${label}`)).toBeTruthy();
    expect(screen.getByText(group.name)).toBeTruthy();
    rendered.rerender(view('vi'));
    expect(screen.getByText(`Hà Nội · ${region}`)).toBeTruthy();
    rendered.rerender(view('en'));
    expect(screen.getByText(`Hà Nội · ${label}`)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en.list.edit }));
    expect(actions.onEdit).toHaveBeenCalledExactlyOnceWith(group);
    expect(group).toEqual(before);
  },
);
