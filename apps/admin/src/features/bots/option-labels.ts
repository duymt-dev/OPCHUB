'use client';

import { useTranslations } from 'next-intl';
import { ACTIVE_HOURS, GENDERS, PERSONA_TONES, SCRIPT_TYPES } from './types';

/** D-141: labels change, existing API/prompt values (including Vietnamese values) do not. */
export function useBotOptionLabels() {
  const t = useTranslations('botOptions');
  const pair = (values: readonly string[], raw: unknown) => {
    const labels: readonly unknown[] = Array.isArray(raw) ? raw : [];
    return values.map((value, index) => ({
      value,
      label: typeof labels[index] === 'string' ? labels[index] : value,
    }));
  };
  const scriptTypes = pair(SCRIPT_TYPES, t.raw('scriptTypes'));
  return {
    tones: pair(PERSONA_TONES, t.raw('tones')),
    genders: pair(GENDERS, t.raw('genders')),
    hours: pair(ACTIVE_HOURS, t.raw('hours')),
    scriptTypes,
    scriptType: (value: string) =>
      scriptTypes.find((option) => option.value === value)?.label ?? value,
  };
}
