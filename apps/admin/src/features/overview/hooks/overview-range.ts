import dayjs from 'dayjs';
import { z } from 'zod';
import { adminOverviewQuerySchema, overviewPeriodSchema } from '@opchub/shared/api-domains';

export const overviewParamsSchema = z
  .object({
    from: z.string().catch(''),
    to: z.string().catch(''),
    period: overviewPeriodSchema.catch('month'),
  })
  .transform(({ from, to, period }) => {
    const parsed = adminOverviewQuerySchema.safeParse({
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      period,
    });
    return parsed.success ? { from, to, period } : { from: '', to: '', period };
  });

export const vnToday = (now = new Date()) =>
  new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);

/** Preset values are functions: an open tab must not freeze yesterday's range. */
export function overviewPresets(now = () => new Date()) {
  const today = () => dayjs(vnToday(now()));
  const range = (days: number): [dayjs.Dayjs, dayjs.Dayjs] => [
    today().subtract(days, 'day'),
    today(),
  ];
  return [
    { label: 'Hôm nay', value: () => range(0) },
    { label: '7 ngày qua', value: () => range(6) },
    { label: '30 ngày qua', value: () => range(29) },
    {
      label: 'Tháng này',
      value: (): [dayjs.Dayjs, dayjs.Dayjs] => [today().startOf('month'), today()],
    },
    {
      label: 'Tháng trước',
      value: (): [dayjs.Dayjs, dayjs.Dayjs] => {
        const prev = today().subtract(1, 'month');
        return [prev.startOf('month'), prev.endOf('month')];
      },
    },
  ];
}
