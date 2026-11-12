import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BUNDLES } from '@/i18n/locales';
import { loadMessages } from '@/i18n/message-loader';
import { ViewOnlyZone } from './components/view-only-zone';
import { isWriteClick, type RoTarget } from './model-ro';
import { createRoMatcher } from './ro-matcher';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@opchub/ui', () => ({ useToast: () => toast }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function targetOf(text: string, title = '', tag = 'BUTTON'): RoTarget {
  return { tag, text, title, roOk: false, act: false, pointer: true };
}

describe('D-141 AC824-06/11 cross-domain ViewOnlyZone write guard across all 10 bundles', () => {
  it.each(BUNDLES)(
    'D-141 AC824-06/11 %s blocks translated domain writes while allowing safe view/navigation controls',
    async (bundle) => {
      const messages = await loadMessages(bundle);
      const matcher = createRoMatcher(messages);

      const writeSamples = [
        messages.members.bulk.export,
        messages.members.bulk.lock,
        messages.members.bulk.assign,
        messages.fees.bulk.collect,
        messages.fees.bulk.csv,
        messages.events.toolbar.create,
        messages.events.form.save,
        messages.projects.bulk.publish,
        messages.projects.drawer.hide,
        messages.bots.persona.new,
        messages.bots.script.run,
        messages.stores.table.hide,
        messages.stores.table.show,
        messages.needs.table.hide,
        messages.marketing.create,
        messages.reports.export,
        messages.requests.csv,
        messages.investors.csv,
        messages.settings.common.save,
        messages.settings.roles.add,
      ];
      for (const label of writeSamples) {
        expect(isWriteClick([targetOf(label)], matcher), `${bundle}: ${label}`).toBe(true);
      }

      const safeSamples = [
        messages.members.drawer.close,
        messages.members.col.selectAll,
        messages.members.col.select.replace('{name}', 'Lê Minh Anh'),
        messages.groups.list.clear,
        messages.settings.log.clearFilters,
        messages.investors.detail,
        messages.stores.table.view,
      ];
      for (const label of safeSamples) {
        expect(isWriteClick([targetOf(label)], matcher), `${bundle}: ${label}`).toBe(false);
      }
    },
  );

  it.each(['en', 'th', 'lo', 'my'] as const)(
    'D-141 AC824-06/11 %s ViewOnlyZone intercepts translated export button and ignores tablist homographs',
    async (bundle) => {
      const messages = await loadMessages(bundle);
      const roleName = 'Giảng viên';
      const onExport = vi.fn();
      const onTab = vi.fn();
      const onSelect = vi.fn();

      render(
        <NextIntlClientProvider locale={bundle} messages={messages}>
          <ViewOnlyZone readOnly role={roleName}>
            <div role="tablist">
              <button type="button" role="tab" onClick={onTab}>
                {messages.settings.tabs['audit-log']}
              </button>
            </div>
            <button
              type="button"
              role="checkbox"
              aria-checked={false}
              aria-label={messages.members.col.select.replace('{name}', 'Lê Minh Anh')}
              onClick={onSelect}
            />
            <button type="button" onClick={onExport}>
              {messages.members.bulk.export}
            </button>
          </ViewOnlyZone>
        </NextIntlClientProvider>,
      );

      fireEvent.click(screen.getByRole('tab'));
      expect(onTab).toHaveBeenCalledOnce();

      fireEvent.click(screen.getByRole('checkbox'));
      expect(onSelect).toHaveBeenCalledOnce();

      fireEvent.click(screen.getByRole('button', { name: messages.members.bulk.export }));
      expect(onExport).not.toHaveBeenCalled();
      expect(toast).toHaveBeenCalledWith(
        messages.common.rbac.viewOnlyToast.replace('{role}', 'Giảng viên'),
      );
    },
  );
});
