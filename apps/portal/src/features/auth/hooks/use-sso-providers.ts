'use client';

import { ssoProviders } from '@opchub/shared/fixtures';
import { usePublicSettings } from './use-registration-open';

/**
 * D-64: chỉ hiện nút Admin đang bật và server hỗ trợ (`/public/settings`). Chưa tải xong → rỗng
 * để không nháy nút bị tắt / chưa cấu hình (Facebook, LinkedIn).
 */
export function useSsoProviders(): { id: string; name: string }[] {
  const { data } = usePublicSettings();
  const on = new Set<string>(data?.ssoProviders ?? []);
  return ssoProviders.filter((s) => on.has(s.id)).map((s) => ({ id: s.id, name: s.name }));
}
