import type { DateTimeFormat } from '@formatjs/intl-datetimeformat';
import type { NumberFormat } from '@formatjs/intl-numberformat';

export type DateConstructor = typeof DateTimeFormat;
export type NumberConstructor = typeof NumberFormat;
export type DateData = Parameters<DateConstructor['__addLocaleData']>[0];
export type NumberData = Parameters<NumberConstructor['__addLocaleData']>[0];
export interface Constructors {
  date: DateConstructor;
  number: NumberConstructor;
}
