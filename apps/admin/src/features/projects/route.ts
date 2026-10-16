/**
 * Đường dẫn màn Dự án (screens.md D-51 → D-57): `/projects` và drawer duyệt
 * `/projects/:id/review`. Query (`?tab&view&page&size`) giữ nguyên khi mở / đóng drawer.
 */
export function parseReviewId(pathname: string): string | null | undefined {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts[0] !== 'projects') return undefined;
  if (parts.length === 1) return null;
  if (parts.length === 3 && parts[2] === 'review' && parts[1]) return decodeURIComponent(parts[1]);
  return undefined;
}

export const reviewPath = (id: string | null) =>
  id ? `/projects/${encodeURIComponent(id)}/review` : '/projects';
