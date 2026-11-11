'use client';

import { useTranslations } from 'next-intl';
import { ACTIVE_HOURS, AGE_RANGES, GENDERS, PERSONA_TONES, SCRIPT_TYPES } from './types';
import { useNumberText } from '@/i18n/use-number-text';

/** D-141: labels change, existing API/prompt values (including Vietnamese values) do not. */
export function useBotOptionLabels() {
  const numberText = useNumberText();
  const t = useTranslations('botOptions');
  const pair = (values: readonly string[], raw: unknown) => {
    const labels: readonly unknown[] = Array.isArray(raw) ? raw : [];
    return values.map((value, index) => ({
      value,
      label: typeof labels[index] === 'string' ? labels[index] : value,
    }));
  };
  const scriptTypes = pair(SCRIPT_TYPES, t.raw('scriptTypes'));
  const tones = pair(PERSONA_TONES, t.raw('tones'));
  const hours = pair(ACTIVE_HOURS, t.raw('hours'));
  return {
    tones,
    ages: AGE_RANGES.map((value) => ({
      value,
      label: value.replace(/\d+/g, (n) => numberText(Number(n))),
    })),
    genders: pair(GENDERS, t.raw('genders')),
    hours,
    tone: (value: string) => tones.find((option) => option.value === value)?.label ?? value,
    activeHour: (value: string) => hours.find((option) => option.value === value)?.label ?? value,
    scriptTypes,
    scriptType: (value: string) =>
      scriptTypes.find((option) => option.value === value)?.label ?? value,
  };
}
