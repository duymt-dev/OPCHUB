import dayjs, { type Dayjs } from 'dayjs';
import { ADMIN_TIME_ZONE } from './format';
import { intlLocaleOf } from './locales';

/** Numeric Gregorian display only; picker callbacks still transport canonical YYYY-MM-DD. */
export function datePickerFormat(locale: string): string {
  return new Intl.DateTimeFormat(intlLocaleOf(locale), {
    calendar: 'gregory',
    timeZone: ADMIN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(new Date('2026-11-21T05:00:00Z'))
    .map((part) => {
      if (part.type === 'year') return 'YYYY';
      if (part.type === 'month') return 'MM';
      if (part.type === 'day') return 'DD';
      // Escape locale punctuation/literals from Dayjs token interpretation.
      return `[${part.value}]`;
    })
    .join('');
}

/** A date-only picker value represents the Vietnam calendar day, not the browser's UTC day. */
const today = (now: Date) =>
  dayjs(new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10));

export function adminDatePresets(labels: readonly string[], now = () => new Date()) {
  const days = (back: number): [Dayjs, Dayjs] => {
    const day = today(now());
    return [day.subtract(back, 'day').startOf('day'), day.endOf('day')];
  };
  const ranges: (() => [Dayjs, Dayjs])[] = [
    () => days(0),
    () => days(6),
    () => days(29),
    () => {
      const day = today(now());
      return [day.startOf('month'), day.endOf('month')];
    },
    () => {
      const previous = today(now()).subtract(1, 'month');
      return [previous.startOf('month'), previous.endOf('month')];
    },
  ];
  return ranges.map((value, index) => ({ label: labels[index] ?? '', value }));
}
