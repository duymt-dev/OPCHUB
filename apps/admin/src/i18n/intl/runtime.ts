import { bundleOf, intlLocaleOf } from '../locales';
import { dataLoaders } from './data-loaders';
import type { Constructors } from './types';
import { AdminIntlResourceError } from './resource-error';

const prepared = new Map<string, Constructors>();
const pending = new Map<string, Promise<void>>();
const failed = new Set<string>();

/** Same pinned CLDR on SSR/client; no Intl override or per-request global default. */
export function prepareAdminIntl(locale: string): Promise<void> | undefined {
  const bundle = bundleOf(locale);
  if (!Object.hasOwn(dataLoaders, bundle) || prepared.has(bundle)) return;
  const previous = pending.get(bundle);
  if (previous) return previous;
  const loader = dataLoaders[bundle as keyof typeof dataLoaders];
  const ready = Promise.all([
    import('@formatjs/intl-datetimeformat'),
    import('@formatjs/intl-numberformat'),
    loader(),
  ])
    .then(([{ DateTimeFormat }, { NumberFormat }, data]) => {
      DateTimeFormat.__addTZData(data.timezone);
      DateTimeFormat.__addLocaleData(data.date);
      NumberFormat.__addLocaleData(data.number);
      // Every constructor below receives an explicit validated locale; never select a shared default.
      prepared.set(bundle, { date: DateTimeFormat, number: NumberFormat });
    })
    .catch((error: unknown) => {
      failed.add(bundle);
      throw new AdminIntlResourceError(bundle, error);
    });
  // Retain a rejected promise too: do not silently fall back or retry on every render.
  pending.set(bundle, ready);
  return ready;
}

/** Explicit user retry only; never discard successful data or silently retry on render. */
export function resetFailedAdminIntl(locale: string): void {
  const bundle = bundleOf(locale);
  if (failed.delete(bundle)) pending.delete(bundle);
}

export function adminNumberFormatter(locale: string, options: Intl.NumberFormatOptions = {}) {
  const constructors = prepared.get(bundleOf(locale));
  const intl = intlLocaleOf(locale);
  // FormatJS declarations exclude explicit undefined on optional digit options;
  // ECMA-402 treats those values as absent, as does its implementation.
  const scopedOptions = options as ConstructorParameters<Constructors['number']>[1];
  return constructors
    ? new constructors.number(intl, scopedOptions)
    : new Intl.NumberFormat(intl, options);
}

export function adminDateFormatter(locale: string, options: Intl.DateTimeFormatOptions = {}) {
  const constructors = prepared.get(bundleOf(locale));
  const intl = intlLocaleOf(locale);
  return constructors
    ? new constructors.date(intl, options)
    : new Intl.DateTimeFormat(intl, options);
}
