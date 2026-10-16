'use client';

import { useRouter } from 'next/navigation';
import { LanguageMenu } from './language-menu';
import type { LanguageOption } from './language-menu';

const YEAR_SEC = 60 * 60 * 24 * 365;

/** Bảng chọn ngôn ngữ: lưu cookie rồi tải lại message phía server (next-intl, không prefix URL) */
export function LanguageSwitch({
  title,
  current,
  options,
  cookieName,
}: {
  title: string;
  current: string;
  options: LanguageOption[];
  cookieName: string;
}) {
  const router = useRouter();
  return (
    <LanguageMenu
      title={title}
      current={current}
      options={options}
      onSelect={(code) => {
        document.cookie = `${cookieName}=${code}; path=/; max-age=${YEAR_SEC}; samesite=lax`;
        router.refresh();
      }}
    />
  );
}
