'use client';

import { useTranslations } from 'next-intl';
import { OPTIONS } from '../model';

type OptionKey = keyof typeof OPTIONS;

/**
 * D-65: giá trị gửi server giữ nguyên (chuỗi tiếng Việt như prototype), nhãn hiển thị theo
 * ngôn ngữ — `services.options.<nhóm>.<chỉ số>`.
 */
export function useOptionLabels(): (key: OptionKey) => [string, string][] {
  const t = useTranslations('services.options');
  return (key) => OPTIONS[key].map((v, i) => [v, t(`${key}.${i}` as 'job.0')]);
}
