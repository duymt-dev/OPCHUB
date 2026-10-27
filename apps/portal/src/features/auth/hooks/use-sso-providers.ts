'use client';

import { ssoProviders } from '@opchub/shared/fixtures';
import { usePublicSettings } from './use-registration-open';

/**
 * D-64: chỉ hiện nút Admin đang bật và server hỗ trợ (`/public/settings`). Chưa tải xong → không
 * hiện nút nào nhưng `pending` để form giữ chỗ (không nháy nút bị tắt, không dịch bố cục).
 */
export function useSsoProviders(): { items: { id: string; name: string }[]; pending: boolean } {
  const { data, isPending } = usePublicSettings();
  const on = new Set<string>(data?.ssoProviders ?? []);
  return {
    items: ssoProviders.filter((s) => on.has(s.id)).map((s) => ({ id: s.id, name: s.name })),
    pending: isPending,
  };
}
