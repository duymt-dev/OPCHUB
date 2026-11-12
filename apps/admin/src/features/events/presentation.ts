import type { AdminEvent } from '@opchub/shared/api-domains';
import { formatDate } from '@/i18n/format';
import { vnDateOf } from './model';

/** UI projection only; never feed a translated date back into the form or API. */
export function eventDay(startsAt: string | null, original: string, locale: string): string {
  return locale === 'vi'
    ? original
    : formatDate(startsAt, locale, { weekday: 'short', day: '2-digit', month: '2-digit' });
}

export function eventTime(
  event: Pick<AdminEvent, 'startsAt' | 'time' | 'endTime'>,
  locale: string,
): string {
  if (locale === 'vi') return event.time;
  const options = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } as const;
  const start = formatDate(event.startsAt, locale, options);
  if (start === '—' || !event.endTime) return start;
  const end = formatDate(`${vnDateOf(event.startsAt)}T${event.endTime}:00+07:00`, locale, options);
  return `${start} – ${end}`;
}
