import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import type * as Ui from '@opchub/ui';
import type { ReactNode } from 'react';
import { groupItemSchema } from '@opchub/shared/api-domains';
import { GroupTable } from '../../features/groups/components/group-table';
import { GroupGrid } from '../../features/groups/components/group-grid';
import { GroupsHead } from '../../features/groups/components/groups-toolbar';
import { ViewOnlyZone } from '../../features/shell/components/view-only-zone';
import viGroups from '../../../messages/vi/groups.json';
import enGroups from '../../../messages/en/groups.json';
import zhGroups from '../../../messages/zh/groups.json';
import idGroups from '../../../messages/id/groups.json';
import thGroups from '../../../messages/th/groups.json';
import msGroups from '../../../messages/ms/groups.json';
import filGroups from '../../../messages/fil/groups.json';
import kmGroups from '../../../messages/km/groups.json';
import loGroups from '../../../messages/lo/groups.json';
import myGroups from '../../../messages/my/groups.json';
import viUi from '../../../messages/vi/ui.json';
import enUi from '../../../messages/en/ui.json';
import zhUi from '../../../messages/zh/ui.json';
import idUi from '../../../messages/id/ui.json';
import thUi from '../../../messages/th/ui.json';
import msUi from '../../../messages/ms/ui.json';
import filUi from '../../../messages/fil/ui.json';
import kmUi from '../../../messages/km/ui.json';
import loUi from '../../../messages/lo/ui.json';
import myUi from '../../../messages/my/ui.json';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@opchub/ui', async (original) => ({
  ...(await original<typeof Ui>()),
  useToast: () => toast,
}));
afterEach(() => {
  cleanup();
  toast.mockClear();
});

it('D-141 AC824-15 mobile group table wraps complete action labels without hiding content', () => {
  const css = readFileSync(
    resolve(__dirname, '../../features/groups/components/group-table.module.css'),
    'utf8',
  );
  expect(css).toMatch(/@media \(max-width: 767px\) \{\s*\.actions \{\s*flex-wrap: wrap;/);
  expect(css).not.toMatch(/overflow-x:\s*hidden|text-overflow|line-clamp|!important/);
});
const cases = [
  ['vi', viGroups, viUi],
  ['en', enGroups, enUi],
  ['en-SG', enGroups, enUi],
  ['zh', zhGroups, zhUi],
  ['id', idGroups, idUi],
  ['th', thGroups, thUi],
  ['ms', msGroups, msUi],
  ['ms-BN', msGroups, msUi],
  ['fil', filGroups, filUi],
  ['km', kmGroups, kmUi],
  ['lo', loGroups, loUi],
  ['my', myGroups, myUi],
] as const;
const group = {
  ...groupItemSchema.parse({
    id: 'pure-owned',
    name: 'Tên nhóm giữ nguyên',
    province: 'Hà Nội',
    region: 'Miền Bắc',
    kind: 'province',
    industry: null,
    parentId: null,
    memberCount: 1,
    weeklyActive: 1,
    description: '',
    myStatus: null,
    coverUrl: null,
    avatars: [],
  }),
  order: 0,
};

for (const [locale, groups, ui] of cases)
  for (const readOnly of [true, false]) {
    const roleName = 'raw-role';
    const wrap = (content: ReactNode) => (
      <NextIntlClientProvider
        locale={locale}
        timeZone="Asia/Ho_Chi_Minh"
        messages={{
          groups,
          ui,
          common: { rbac: { viewOnly: 'Role {role}', viewOnlyToast: 'Denied {role}' } },
        }}
      >
        <ViewOnlyZone readOnly={readOnly} role={roleName}>
          {content}
        </ViewOnlyZone>
      </NextIntlClientProvider>
    );
    for (const layout of ['grid', 'table']) {
      it(`D-141 AC824-11 semantic group ${layout} actions ${locale} readonly=${readOnly}`, () => {
        const actions = { onEdit: vi.fn(), onExport: vi.fn(), onDelete: vi.fn(), onChat: vi.fn() };
        render(
          wrap(
            layout === 'grid' ? (
              <GroupGrid items={[group]} actions={actions} />
            ) : (
              <GroupTable
                items={[group]}
                selected={new Set()}
                onToggle={vi.fn()}
                onToggleAll={vi.fn()}
                actions={actions}
              />
            ),
          ),
        );
        for (const [label, handler] of [
          [groups.list.edit, actions.onEdit],
          [groups.list.exportOne, actions.onExport],
          [groups.list.delete, actions.onDelete],
        ] as const) {
          const button = screen.getByRole('button', { name: label });
          expect(button.getAttribute('data-act')).toBe('write');
          fireEvent.click(button);
          if (readOnly) expect(handler).not.toHaveBeenCalled();
          else expect(handler).toHaveBeenCalledExactlyOnceWith(group);
        }
        fireEvent.click(screen.getByRole('button', { name: groups.list.chat }));
        expect(actions.onChat).toHaveBeenCalledExactlyOnceWith(group);
        expect(toast).toHaveBeenCalledTimes(readOnly ? 3 : 0);
        expect(screen.getByText(group.name)).toBeTruthy();
      });
    }
    it(`D-141 AC824-11 semantic group header actions ${locale} readonly=${readOnly}`, () => {
      const onCreate = vi.fn(),
        onExport = vi.fn(),
        onView = vi.fn();
      const result = render(
        wrap(<GroupsHead view="grid" onCreate={onCreate} onExport={onExport} onView={onView} />),
      );
      const writes = result.container.querySelectorAll('[data-act="write"]');
      expect(writes).toHaveLength(2);
      writes.forEach((button) => fireEvent.click(button));
      expect(onCreate).toHaveBeenCalledTimes(readOnly ? 0 : 1);
      expect(onExport).toHaveBeenCalledTimes(readOnly ? 0 : 1);
      fireEvent.click(screen.getByRole('button', { name: groups.list.viewList }));
      expect(onView).toHaveBeenCalledExactlyOnceWith('list');
      expect(toast).toHaveBeenCalledTimes(readOnly ? 2 : 0);
    });
  }
