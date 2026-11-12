import { readFileSync } from 'node:fs';
import { z } from 'zod';
import type { ControlLocale } from '../admin-i18n/control-labels';

const text = z.string().min(1);
const fields = <T extends readonly string[]>(keys: T) =>
  z.object(Object.fromEntries(keys.map((key) => [key, text])) as Record<T[number], typeof text>);
export function valueLabels(locale: ControlLocale) {
  const bundle = locale === 'en-SG' ? 'en' : locale === 'ms-BN' ? 'ms' : locale;
  const raw = (name: string): unknown =>
    JSON.parse(
      readFileSync(
        new URL(`../../../apps/admin/messages/${bundle}/${name}.json`, import.meta.url),
        'utf8',
      ),
    ) as unknown;
  return {
    menu: z.object({ shell: fields(['menu'] as const) }).parse(raw('common')).shell.menu,
    groups: z
      .object({
        list: fields(['edit', 'regionLabel', 'search', 'viewList'] as const),
        form: fields(['editTitle', 'name', 'province', 'region', 'save', 'close'] as const),
      })
      .parse(raw('groups')),
    bots: z
      .object({
        persona: fields(['edit'] as const),
        tabs: fields(['persona'] as const),
        pf: fields([
          'title',
          'name',
          'gender',
          'female',
          'age',
          'bio',
          'tone',
          'hours',
          'save',
          'cancel',
        ] as const),
      })
      .parse(raw('bots')),
    regions: z.object({ regions: fields(['north', 'central', 'south'] as const) }).parse(raw('ui'))
      .regions,
    options: z
      .object({ tones: z.array(text).length(6), hours: z.array(text).length(5) })
      .parse(raw('bot-options')),
  };
}
