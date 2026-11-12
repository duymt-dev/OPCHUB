'use client';

import dayjs from 'dayjs';
import { DateRangePicker } from '@opchub/ui';
import type { AdminOverview } from '@opchub/shared/api-domains';
import { overviewPresets, vnToday } from '../hooks/overview-range';
import { useOverviewUrl } from '../hooks/use-overview-url';
import { useAdminUiLabels } from '@/i18n/ui-labels';

export function OverviewRangeControl({ range }: { range?: AdminOverview['range'] | undefined }) {
  const { params, update } = useOverviewUrl();
  const ui = useAdminUiLabels();
  const today = vnToday();
  const shown =
    params.from && params.to ? params : (range ?? { from: `${today.slice(0, 8)}01`, to: today });
  return (
    <DateRangePicker
      {...ui.dateRange}
      value={[dayjs(shown.from), dayjs(shown.to)]}
      presets={overviewPresets().map((preset, index) => ({
        ...preset,
        label: ui.presetLabels[index] ?? preset.label,
      }))}
      onChange={(dates) =>
        update(
          dates?.[0] && dates[1]
            ? { from: dates[0].format('YYYY-MM-DD'), to: dates[1].format('YYYY-MM-DD') }
            : { from: '', to: '' },
        )
      }
    />
  );
}
