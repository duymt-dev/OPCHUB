import type { CSSProperties } from 'react';
import { bundleOf } from './locales';

const SCRIPT_FAMILIES = {
  zh: 'OPCHUB SC',
  th: 'OPCHUB Thai',
  km: 'OPCHUB Khmer',
  lo: 'OPCHUB Lao',
  my: 'OPCHUB Myanmar',
} as const;

/** Server-scoped finite selection. Fonts are CSS assets, never bundled into executable JS. */
export function adminFontStyle(locale: string): CSSProperties & { '--admin-font-family': string } {
  const bundle = bundleOf(locale);
  const script = Object.hasOwn(SCRIPT_FAMILIES, bundle)
    ? SCRIPT_FAMILIES[bundle as keyof typeof SCRIPT_FAMILIES]
    : undefined;
  return {
    '--admin-font-family': script
      ? `'OPCHUB Latin', '${script}', sans-serif`
      : "'OPCHUB Latin', sans-serif",
  };
}
