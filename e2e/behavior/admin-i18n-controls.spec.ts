import { test } from './admin-i18n/fixtures';
import { CORE_LOCALES, controlLabels } from './admin-i18n/control-labels';
import { calendarControl } from './admin-i18n/control-calendar';
import { memberControls } from './admin-i18n/control-members';
import { editorControl } from './admin-i18n/control-editor';
import { emptyControl } from './admin-i18n/control-empty';

for (const locale of CORE_LOCALES)
  for (const width of [1440, 390]) {
    const labels = controlLabels(locale);
    for (const kind of ['calendar', 'members', 'editor', 'empty'] as const)
      test(`D-141 AC824-07/08/09/15 actual ${locale} ${kind} ${width}`, async ({ page, guard }) => {
        await page.setViewportSize({ width, height: 1000 });
        if (kind === 'calendar') await calendarControl(page, locale, labels, width);
        else if (kind === 'members') await memberControls(page, locale, labels);
        else if (kind === 'editor') await editorControl(page, locale, labels, width);
        else await emptyControl(page, locale, labels);
        await guard.settle();
      });
  }
