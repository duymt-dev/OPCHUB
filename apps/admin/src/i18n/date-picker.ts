import dayjs, { type Dayjs } from 'dayjs';
import { bundleOf } from './locales';

/** Numeric Gregorian display only; picker callbacks still transport canonical YYYY-MM-DD. */
export function datePickerFormat(locale: string): string {
  // These approved numeric orders must agree on SSR and reduced-ICU browsers.
  // Inferring them from Intl silently gives US order for unsupported lo/km/my.
  const bundle = bundleOf(locale);
  if (bundle === 'zh') return 'YYYY[/]MM[/]DD';
  if (bundle === 'fil') return 'MM[/]DD[/]YYYY';
  return 'DD[/]MM[/]YYYY';
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
